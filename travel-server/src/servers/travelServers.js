import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Agent, run, setDefaultOpenAIClient } from '@openai/agents';
import OpenAI from 'openai';
import { tools } from './tools.js';
import { sessionStore } from '../db/store.js';
import 'dotenv/config';
// 滑动窗口大小：只把最近 N 条消息发给模型，防止历史无限增长导致 token 超限
const CONTEXT_WINDOW_SIZE = 20
class travelServers{
  // 构造函数,执行该函数时,会自动调用initLLM方法,初始化LLM模型
  constructor(){
    this.llm = null
    this.initLLM()
  }
  // 初始化LLM模型
  initLLM(){
    const provide = process.env.MODEL_PROVIDER
    let apikey,baseurl,modelname;
    if(provide === 'SILICONFLOW'){
      apikey = process.env.SILICONFLOW_API_KEY
      baseurl = process.env.SILICONFLOW_BASE_URL
      modelname = process.env.SILICONFLOW_MODEL
    }else {
      apikey = process.env.DEEPSEEK_API_KEY
      baseurl = process.env.DEEPSEEK_BASE_URL
      modelname = process.env.DEEPSEEK_MODEL
    }
    // 创建ChatOpenAI实例,用于调用大模型
    this.llm = new ChatOpenAI({
      // 配置模型的API密钥和基础URL
      configuration:{
        baseURL:baseurl,
      },
      apiKey:apikey,
      model: modelname,
      // 温度参数,用于控制模型的输出随机性,值越小,模型越确定,值越大,模型越随机
      temperature:0.7,
      // 开启流式输出,用于实时返回模型生成的文本,实现打字机效果
      streaming:true,
    })
    // Agents SDK 底层通过 OpenAI 兼容协议对接 DeepSeek/硅基流动，替换默认 client
    setDefaultOpenAIClient(new OpenAI({
      apiKey: apikey,
      baseURL: baseurl
    }))
    this.modelName = modelname
  }
  // recommend接口,用于生成旅游规划
  async recommend(city,budget,days){
      if(budget<100||days<1||days>30){
        throw new Error('预算不能低于100元,天数必须在1-30天之间')
      }
      const prompt = this.getTravelPrompt(city,budget,days)
      // 这个try和catch块,用于处理模型调用失败的情况
      try{
        // invoke方法,用于调用大模型,返回模型的响应
        const response = await this.llm.invoke(prompt)
        console.log(response)
        const fullResponse = typeof response === 'string' ? response : 
          (response.content || (response.text || ''))
        try{
          const jsonMatch = fullResponse.match(/```json\n([\s\S]*?)\n```/) ||
            fullResponse.match(/```\n([\s\S]*?)\n```/) ||
            fullResponse.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error(`无法从响应中提取JSON: ${fullResponse.substring(0, 200)}`)
          }
          const jsonStr = jsonMatch[1] || jsonMatch[0]
          const resData = JSON.parse(jsonStr)
          return resData
        }catch(err){
           return{
            success:false,
            error:'模型解析JSON失败',
            rawResponse: err.message
           }
        }
      }catch(err){
        return {
          success:false,
          message:err.message
        }
      }
    }
  // 生成旅游规划提示词
  getTravelPrompt(city,budget,days){
      return [
        new HumanMessage(`你是一个专业的旅游规划师，擅长根据用户的需求生成详细的旅行行程。

请根据以下信息为用户生成一份详细的旅游规划：
- 目的地城市：${city}
- 预算：${budget}元
- 旅行天数：${days}天

要求：
1. 每天的行程安排（上午、下午、晚上）
2. 每个景点的详细介绍
3. 交通建议
4. 预算分配明细
5. 注意事项

请以JSON格式输出，结构如下：
{
  "success": true,
  "city": "城市名",
  "days": 天数,
  "totalBudget": 总预算,
  "dailyItinerary": [
    {
      "day": 1,
      "date": "第1天",
      "morning": {
        "spot": "景点名称",
        "duration": "游览时长",
        "ticket": "门票价格",
        "transportation": "交通方式",
        "description": "景点介绍"
      },
      "afternoon": {
        "spot": "景点名称",
        "duration": "游览时长",
        "ticket": "门票价格",
        "transportation": "交通方式",
        "description": "景点介绍"
      },
      "evening": {
        "spot": "活动名称",
        "duration": "活动时长",
        "ticket": "费用",
        "transportation": "交通方式",
        "description": "活动介绍"
      }
    }
  ],
  "budgetBreakdown": {
    "accommodation": 住宿费用,
    "food": 餐饮费用,
    "transportation": 交通费用,
    "tickets": 门票费用,
    "other": 其他费用
  },
  "tips": ["提示1", "提示2", "提示3"],
  "warnings": ["注意事项1", "注意事项2"]
}

请确保JSON格式正确，可以被解析。`)
      ]
    }
    // chat接口,用于与模型进行对话
  async chat(message,streamCallback){
    // 组装参数,一个是用户发出的消息,一个是系统提示词
    const messages = [
      new SystemMessage('你是一个专业的旅游规划师，擅长根据用户的需求生成详细的旅行行程。'),
      new HumanMessage(message)
    ]
    try{
      // 调用大模型,使用stream方法,实现流式输出,并传入参数messages
      const stream = await this.llm.stream(messages)
      let fullResponse = ''
      for await (const chunk of stream) {
        // content是模型返回的内容,用于存储模型返回的文本,chunk是模型返回的每个文本块
        const content = chunk.content||''
        if(content.trim() === ''){
          continue
        }
        // 拼接模型返回的文本,并存储到fullResponse中
        fullResponse += content
        // streamCallback是流式回调函数,用于将模型返回的文本发送到客户端,并实现打字机效果
        if(streamCallback){
          streamCallback(content)
        }
      }
      return {
        success:true,
        reply:fullResponse
      }
    }catch(err){
      return {
        success:false,
        error:err.message
      }
    }
  }
  // agentChat接口,基于 OpenAI Agents SDK 构建 Agent 智能体
  // SDK 内部已封装完整的 ReAct 循环：模型思考 -> 自动解析 tool_calls -> 执行工具 ->
  // 结果自动追加进上下文 -> 继续思考，直到产出最终回答，无需手写循环
  // 多轮对话：模型是无状态的，每轮从 SQLite 取出该会话的最近 N 条历史一起发给模型
  async agentChat(message,sessionId,streamCallback,toolCallback){
    // 定义智能体：名称、指令(角色设定)、可用工具、模型
    const agent = new Agent({
      name: '旅游助手',
      instructions: '你是一个专业的旅游规划师。当用户的问题涉及城市天气、景点信息时，优先调用工具获取真实数据，再基于工具结果回答；其他问题可直接回答。',
      tools: tools,
      model: this.modelName
    })
    // 从会话存储中取出最近 N 条历史（滑动窗口），拼上本轮用户消息
    // SDK 要求 assistant 消息的 content 是结构化数组，user 消息可以是纯字符串
    const history = sessionStore.getContextMessages(sessionId, CONTEXT_WINDOW_SIZE)
    const input = [
      ...history.map(m => m.role === 'assistant'
        ? { role: 'assistant', content: [{ type: 'output_text', text: m.content }] }
        : { role: 'user', content: m.content }),
      { role: 'user', content: message }
    ]
    try{
      // run() 以流式模式启动 Agent，SDK 自动完成多轮工具调用循环
      const result = await run(agent, input, { stream: true, maxTurns: 5 })
      let fullResponse = ''
      // 遍历 SDK 的流式事件：区分文本增量、工具调用、Agent 切换等
      for await (const event of result){
        // 模型原始流事件：过滤出文本增量，实现打字机效果
        if(event.type === 'raw_model_stream_event'){
          const delta = event.data?.delta
          if(typeof delta === 'string' && delta){
            fullResponse += delta
            if(streamCallback){
              streamCallback(delta)
            }
          }
        // Agent 运行项事件：工具开始/结束调用时通知前端展示状态
        }else if(event.type === 'run_item_stream_event'){
          const item = event.item
          if(item?.type === 'tool_call_item'){
            toolCallback && toolCallback({tool: item.rawItem?.name, status: 'calling'})
          }else if(item?.type === 'tool_call_output_item'){
            toolCallback && toolCallback({tool: item.rawItem?.name, status: 'done'})
          }
        }
      }
      const reply = fullResponse || result.finalOutput || ''
      // 本轮对话成功完成后落库：用户消息 + AI 回复，供下一轮取作上下文
      sessionStore.appendMessage(sessionId, 'user', message)
      sessionStore.appendMessage(sessionId, 'assistant', reply)
      return {
        success:true,
        reply
      }
    }catch(err){
      return {
        success:false,
        error:err.message
      }
    }
  }
  // 会话管理：校验或创建会话，返回 sessionId
  ensureSession(sessionId){
    return sessionStore.ensureSession(sessionId)
  }
  // 查询会话全部历史消息，用于前端刷新后恢复
  getHistory(sessionId){
    return sessionStore.getAllMessages(sessionId)
  }
}
export default new travelServers();
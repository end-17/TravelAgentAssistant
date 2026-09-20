import express from 'express';
const router = express.Router();
import travelServers from '../servers/travelServers.js';
import { createStream } from '../utils/streamutils.js';

router.post('/recommend',async (req,res) => {
  const {city,budget,days} = req.body;
  if(!city || !budget || !days){
    return res.json({
      message:'缺少必要参数',
      status:'error'
    })
  }
  const result =await travelServers.recommend(city,budget,days)
  return res.json(result)
})

router.post('/chat',async(req,res) => {
  const {message} = req.body;
  if(!message){
    return res.status(400).json({
      success:false,
      error:'缺少必要参数'
    })
  }
  // 对SSE流式接口返回进行处理
  // 调用createStream函数,创建一个事件流
  const stream = createStream(res)
  // 流式对话的返回数据,result是返回的完整内容,也就是fullResponse
  const result = await travelServers.chat(message,(chunk) => {
    stream.send({type:'chunk',content:chunk})
  })
  // 告诉客户端流式对话结束,将完整的result发送到客户端
  stream.send({type:'complete',data:result})
  // 结束流式
  stream.end()
})

// Agent对话接口,在SSE协议中新增tool帧,用于向前端推送工具调用状态
router.post('/agent-chat',async(req,res) => {
  const {message, sessionId: rawSessionId} = req.body;
  if(!message){
    return res.status(400).json({
      success:false,
      error:'缺少必要参数'
    })
  }
  // 校验或创建会话：前端首次发送时没有 sessionId，后端创建新会话
  const sessionId = travelServers.ensureSession(rawSessionId)
  const stream = createStream(res)
  // session帧:第一时间把 sessionId 推给前端，前端持久化后刷新页面可恢复会话
  stream.send({type:'session', sessionId})
  const result = await travelServers.agentChat(
    message,
    sessionId,
    // chunk帧:正常的文本流,打字机效果
    (chunk) => {
      stream.send({type:'chunk',content:chunk})
    },
    // tool帧:推送工具调用状态,前端渲染"正在查询天气..."等提示
    (toolInfo) => {
      stream.send({type:'tool',...toolInfo})
    }
  )
  stream.send({type:'complete',data:{...result, sessionId}})
  stream.end()
})

// 会话历史接口：前端刷新页面后按 sessionId 恢复消息列表
router.get('/history',(req,res) => {
  const {sessionId} = req.query;
  if(!sessionId){
    return res.status(400).json({
      success:false,
      error:'缺少sessionId'
    })
  }
  const messages = travelServers.getHistory(sessionId)
  return res.json({
    success:true,
    messages
  })
})

export default router;

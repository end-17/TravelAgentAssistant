import axios from 'axios'

const request = axios.create({
  baseURL: 'http://127.0.0.1:3001/api/travel',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
})

request.interceptors.request.use(
  config => {
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    return Promise.reject(error)
  }
)

export function post(url, data) {
  return request.post(url, data)
}

export function get(url, params) {
  return request.get(url, { params })
}
// 流式请求函数，整个过程大概是：先发送 POST 请求，服务器返回流式数据，客户端读取流，使用while循环读取数据，解码为字符串，解析 JSON，将数据按换行符分割过滤空行，判断是否是 SSE 格式的数据行，根据数据类型分发处理，直到流结束
// options.onTool 可选，Agent接口的工具调用状态回调
export async function fetchStream(url,data,onChunk,onComplete,onError,options = {}){
  // 创建一个中止控制器，用于支持取消请求
  const controller = new AbortController()
  try{
    const response = await fetch(`http://127.0.0.1:3001/api/travel/${url}`,{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify(data),
      // signal: controller.signal 绑定中止信号
      signal:controller.signal
    })
    // 获取响应体的可读流读取器（核心！流式数据的入口）
    const reader = response.body.getReader()
    // 创建文本解码器
    const decoder = new TextDecoder()
    // 无限循环读取数据，直到流结束
    while(true){
      // 读取一段数据，返回 { done: 是否结束, value: 二进制数据块 }
      const {done,value} = await reader.read()
      if(done)break
      // 将二进制数据解码为字符串
      // { stream: true } 表示这是一个持续的流，解码器会保留未完成的字符
      const chunk = decoder.decode(value,{stream:true})
      // 将数据按换行符分割，并过滤空行
      const lines = chunk.split('\n').filter(line=>line.trim())
      for(const line of lines){
        console.log(line)
        try{
          // 判断是否是 SSE 格式的数据行（以 "data:" 开头）
          if(line.startsWith('data:')){
            // 去掉 "data:" 前缀，获取 JSON 字符串
            const jsonStr = line.substring(5)
            // 解析 JSON 字符串为对象
            const jsonData = JSON.parse(jsonStr)
            // 根据数据类型分发处理，分别是正常的代码块、工具调用状态、会话标识、完成信号、错误信号
            if(jsonData.type === 'chunk'){
              onChunk(jsonData.content)
            }else if(jsonData.type === 'tool'){
              options.onTool && options.onTool(jsonData)
            }else if(jsonData.type === 'session'){
              options.onSession && options.onSession(jsonData.sessionId)
            }else if(jsonData.done){
              onComplete(jsonData.data)
            }else if(jsonData.type === 'complete'){
              onComplete(jsonData.data)
            }else if(jsonData.error){
              onError(jsonData.error)
            }
          }
          // JSON 解析失败时的错误处理
        }catch(error){
          onError('流式数据解析异常')
        }
      }
    }
    return controller.abort()
    // 网络错误或请求被中止时的处理
  }catch(error){
    onError(error.message)
  }
}

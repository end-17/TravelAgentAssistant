// 这个文件的代码是创建一个事件流,用于向客户端发送数据,并处理错误情况
export const createStream = (res) => {
  // 设置响应头,分别指定返回内容为事件流格式,指定缓存控制为不缓存,保持http链接为长连接
  res.setHeader('Content-Type','text/event-stream')
  res.setHeader('Cache-Control','no-cache') 
  res.setHeader('Connection','keep-alive')
  return {
    // 发送数据到客户端,write方法,将数据转换为json字符串,并添加data前缀,用try catch捕获流式发送错误,并打印错误信息
    send: (data) => {
      try{
        res.write(`data:${JSON.stringify(data)}\n\n`)
      }catch(error){
        console.log(`流式发送错误`,error)
      }
    },
    // 结束流式,write方法,将数据转换为json字符串,并添加event:end前缀,event是结束事件,done为true,表示数据发送完成,并用try catch捕获流式结束错误,并打印错误信息
    end: () => {
      try{
        res.write(`event:end\ndata:{"done": true}\n\n`)
        res.end()
      }catch(error){
        console.log(`流式结束错误`,error)
      }
    },
    // 发送错误信息到客户端
    error: (message) => {
      try{
        res.write(`data:${JSON.stringify(message)}\n\n`)
        res.end()
      }catch(error){
        console.log(`流式错误错误`,error)
      }
    }
  }
}
import express from 'express';
import travelRouter from './router/travel.js';
import 'dotenv/config';
import cors from 'cors';
// 创建express应用实例,需在其他中间件之前调用
const app = express();
// 跨域中间件
app.use(cors());
// 从环境变量中获取端口号
const port = process.env.PORT
// 中间件，解析请求体中的json数据
app.use(express.json());
// 解析请求体中的urlencoded数据,如form表单数据,query字符串数据等
app.use(express.urlencoded({extended:true}));

// req是前端发送的http请求,包含请求方法,请求路径,请求头,请求体等信息
// res是服务端返回的http响应,包含响应状态码,响应头,响应体等信息
app.post('/heartbeat',(req,res) => {
  console.log(req.query)
  console.log(req.body)
  res.json({
    message:'服务正常运行',
    status:'success'
  })
})

// 路由中间件
app.use('/api/travel',travelRouter)

// 启动服务,监听指定端口,并打印服务地址,提示用户服务已启动
// 访问服务地址,即可查看服务是否正常运行
app.listen(port,() => {
  console.log(`服务地址:http://localhost:${port}`)
})
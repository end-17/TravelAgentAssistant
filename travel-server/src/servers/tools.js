// Agent 工具定义：基于 OpenAI Agents SDK 的 tool() + zod schema
// SDK 自动将 zod schema 转换为 OpenAI function calling 格式，
// 并在 ReAct 循环中自动执行工具、维护上下文，无需手动解析 tool_calls
import { tool } from '@openai/agents'
import { z } from 'zod'

// 模拟天气数据（可替换为和风天气等真实 API）
const weatherMock = {
  '北京': [
    { date: '今天', weather: '晴', temp: '22~30°C' },
    { date: '明天', weather: '多云', temp: '21~29°C' },
    { date: '后天', weather: '小雨', temp: '19~26°C' }
  ],
  '上海': [
    { date: '今天', weather: '阴', temp: '24~28°C' },
    { date: '明天', weather: '中雨', temp: '23~26°C' },
    { date: '后天', weather: '晴', temp: '24~31°C' }
  ]
}

// 模拟景点数据（可替换为高德 POI 等真实 API）
const spotMock = {
  '北京': ['故宫', '天安门', '颐和园', '八达岭长城', '南锣鼓巷'],
  '上海': ['外滩', '东方明珠', '豫园', '迪士尼', '田子坊']
}

// 天气查询工具
export const weatherTool = tool({
  name: 'get_weather',
  description: '查询指定城市未来几天的天气情况，用于行程规划时避开雨天、安排室内外活动',
  parameters: z.object({
    city: z.string().describe('城市名，如：北京'),
    days: z.number().min(1).max(3).describe('查询未来几天,1-3天')
  }),
  execute: async ({ city, days }) => {
    const list = weatherMock[city] || [
      { date: '今天', weather: '晴', temp: '20~28°C' },
      { date: '明天', weather: '多云', temp: '20~27°C' },
      { date: '后天', weather: '晴', temp: '21~29°C' }
    ]
    return JSON.stringify({ city, forecast: list.slice(0, days) })
  }
})

// 景点搜索工具
export const spotTool = tool({
  name: 'search_spot',
  description: '搜索指定城市的热门景点列表，用于推荐必去景点',
  parameters: z.object({
    city: z.string().describe('城市名，如：上海')
  }),
  execute: async ({ city }) => {
    const spots = spotMock[city] || [`${city}热门景点A`, `${city}热门景点B`, `${city}热门景点C`]
    return JSON.stringify({ city, spots })
  }
})

export const tools = [weatherTool, spotTool]

<template>
  <div class="page-container">
    <div class="page-herader">
      <van-nav-bar title="智能旅游助手" />
    </div>
    <div class="page-content">
      <van-notice-bar
      left-icon="info-o"
      text="基于AI的智能景点与行程规划系统" />
      <div class="card search-card">
        <div class="section-title">
          规划你的旅程
        </div>
          <div>
            <van-field
            is-link
            readonly
            v-model="formData.city"
            name="username"
            label="目的地"
            placeholder="请选择城市"
            style="background-color: f7f8fa;border-radius: 8px;margin-bottom: 12px;"
            @click="showCityPicker = true"
            />

            <van-field
              v-model="formData.budget"
              type="number"
              label="预算"
              placeholder="请输入预算"
              :border="false"
              style="background-color: f7f8fa;border-radius: 8px;margin-bottom: 12px;"
            />
            <van-field
              v-model="formData.days"
              type="digit"
              label="天数"
              placeholder="请输入天数"
              :border="false"
              style="background-color: f7f8fa;border-radius: 8px;margin-bottom: 12px;"
            />
            <van-button 
              type="primary" 
              size="large"
              round
              :loading="isloading"
              @click="handleSummit"
            >
              开始规划
            </van-button>
          </div> 
      </div>

      <div class="card quick-actions">
        <div class="section-title">
          快捷入口
        </div>
        <van-grid :column-num="2" :gutter="12">
            <van-grid-item @click="goPage('./chat')" icon="chat-o" text="AI对话" />
            <van-grid-item @click="goPage('./profile')" icon="user-o" text="我的" />
        </van-grid>
      </div>

      <div class="card popular-destinations">
        <div class="section-title">
          热门城市
        </div>
        <van-grid :column-num="4" :gutter="12">
          <!-- 绑定点击事件，将选中的城市赋值给formData.city -->
          <!-- 使用v-for遍历热门城市数组，依次渲染城市标签 -->
          <!-- active的实现原理是：当formData.city等于当前城市时，也就是用户点击时，添加active类名，否则移除active类名 -->
          <van-grid-item @click="selectedCity(city)" v-for="city in popularCity" :key="city">
            <div class="city-tag" :class="{active: formData.city === city}">
              {{ city }}
            </div>
          </van-grid-item>
        </van-grid>
      </div>
    </div>
    <!-- 城市选择器弹窗 -->
    <van-popup
      round
      v-model:show="showCityPicker"
      position="bottom"
    >
    <!-- 城市选择器内容，handleCityConfirm处理确认选择，showCityPicker = false关闭弹窗 -->
      <van-picker
        title="请选择目的地"
        :columns="cityColumns"
        @confirm="handleCityConfirm"
        @cancel="showCityPicker = false"
      />
    </van-popup>
 </div>
</template>

<script setup>
  import { ref,reactive } from 'vue'
  import { useRouter } from 'vue-router'
  import {showToast} from 'vant'

  // 创建路由实例，用于跳转页面
  const router = useRouter()

  const formData = reactive({
    city: '',
    budget: null,
    days: null
  })

  const allCities = [
  '北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '重庆',
  '南京', '武汉', '苏州', '长沙', '天津', '郑州', '济南', '青岛',
  '大连', '沈阳', '哈尔滨', '长春', '福州', '厦门', '南昌', '合肥',
  '昆明', '贵阳', '南宁', '桂林', '海口', '三亚', '丽江', '大理',
  '西安', '兰州', '乌鲁木齐', '拉萨', '呼和浩特', '太原', '石家庄'
 ]
// 遍历所有城市，将每个城市转换为对象，包含text和value属性，符合van-picker组件的要求
  const cityColumns = allCities.map(city => ({
    text: city,
    value: city
  }))
  
  const showCityPicker = ref(false)
  // 城市选择器确认选择处理函数，selectedOptions里有多项，第0项就是我们要的城市，将其解构，将选中的城市赋值给formData.city，关闭弹窗
  const handleCityConfirm = ({ selectedOptions }) => {
    formData.city = selectedOptions[0].value
    showCityPicker.value = false
  }

  const isloading = ref(false)
  const handleSummit = () => {
    isloading.value = true
    if(!formData.city || !formData.budget || !formData.days ){
      showToast('请填写完整信息')
      return
    }
    router.push(
      {
        name:'Detail',
        // 路由参数，用于传递数据到Detail页面
        query:{
          city:formData.city,
          budget:formData.budget,
          days:formData.days
        }
      }
    )
  }

  const goPage = (path) => {
    // push方法用于跳转到指定路径，不会替换当前路由
    router.push(path)
  }

  const popularCity = [
    '北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '重庆'
  ]
  // 点击热门城市，将选中的城市赋值给formData.city
  const selectedCity = (city) => {
    formData.city = city
  }

</script>

<style scoped>
  .search-card{
    margin-bottom:16px
  }
  .city-tag{
    padding:8px 12px;
    border-radius: 16px;
    font-size:14px;
    color:#666;
    background:#f7f8fa;
    transition: all 0.3s;
  }
  .city-tag.active{
    background: #1989fa;
    color: #fff;
  }
</style>
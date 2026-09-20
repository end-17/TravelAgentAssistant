<template>
  <div class = "page-container">
    <div class = "page-header">
      <van-nav-bar
        left-arrow
        @click-left="onBack"
        :title="formData.city + '行程规划'"
      />
    </div>
    <div class = "page-content">
      <div v-if = "isloading" class = "loading-container">
        <van-loading size = "48px" type="spinner">
          正在规划行程中...
        </van-loading>
      </div>
      <div v-else-if = "errorMsg"> 
        <van-empty :description="errorMsg">
           <van-button type="primary" @click="fetchTripData">
             重试
           </van-button>
        </van-empty>
      </div>
      <template v-else-if = "tripData && tripData.success !== false">
        <div class = "card overview-card">
          <div calss = "trip-header">
            <h2>{{tripData.city}}·{{tripData.days}}天行程</h2>
            <div class = "trip-budget">预算：{{ tripData.totalBudget }}元</div>
          </div>
        </div>
        <!-- 使用v-model绑定activeDays,实现点击标题展开/收起内容 -->
        <van-collapse v-model = "activeDays">
          <van-collapse-item 
          v-for = "day in tripData.dailyItinerary" 
          :key = "day.day" 
          :title = "'第' + day.day + '天'"
          :name = "day.day">
          <div class="day-schedule">
            <div class="schedule-scetion">
              <div class="section-label morning">上午</div>
              <SpotItem :data = "day.morning" />
            </div>
            <div class="schedule-scetion">
              <div class="section-label afternoon">下午</div>
              <SpotItem :data = "day.afternoon" />
            </div>
            <div class="schedule-scetion">
              <div class="section-label evening">晚上</div>
              <SpotItem :data = "day.evening" />
            </div>
          </div>
        </van-collapse-item>
        </van-collapse>
        <div class="card budget-card" v-if="tripData.budgetBreakdown">
          <div class="section-ttle">
            预算明细
          </div>
          <BudgetTable :data = "tripData.budgetBreakdown" :total = "tripData.totalBudget"/>
        </div>
        <div class="card tips-card" v-if = "tripData.tips && tripData.tips.length">
          <div class="section-ttle">
            温馨提示
          </div>
          <ul class="tips-list">
            <li v-for="(tips,index) in tripData.tips" :key = "index">{{tips}}</li>
          </ul>
        </div>
        <div class = "card warnings-card" v-if = "tripData.warnings && tripData.warnings.length">
          <div class = "section-title">
            注意事项
          </div>
          <ul class="warnings-list">
            <li v-for="(warning,index) in tripData.warnings" :key = "index">{{warning}}</li>
          </ul>
        </div>
        <div class="detail-footer" v-if = "tripData && tripData.success !== false">
          <van-button type="primary" size = "large" round @click="goToChat" class = "primary-button">
            咨询AI助手
          </van-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
  import {onMounted, ref, reactive} from 'vue'
  import {useRoute, useRouter} from 'vue-router'
  import {post} from '../utils/request'
  import SpotItem from '../components/SpotItem.vue'
  import BudgetTable from '../components/BudgetTable.vue'
  
  const route = useRoute()
  const router = useRouter()

  // 加载状态
  const isloading = ref(true)

  // 表单数据
  const formData = reactive({
    city:'',
    budget:null,
    days:null
  })

  const onBack = () => {
    router.back()
  }
  const goToChat = () => {
    router.push({
      path:'/chat',
      query:{
        // 来源
        scene:'detail',
        city:formData.city
      }
    })
  }
  // 活动天数
  const activeDays = ref([])
  const tripData = ref(null)
  const errorMsg = ref('')
// 调用后端接口
  const fetchTripData = async() => {
    const res  = await post('/recommend',{
      city:formData.city,
      budget:formData.budget,
      days:formData.days
    })
    isloading.value = false
    console.log(res)
    if(res && res.success != false){
      tripData.value = res
    }else{
      errorMsg.value = res.error
    }
  }
  // 从当前页面路由的url中获取query参数,拿到后可用于响应式数据,挂载在onMounted中,确保在组件挂载完成后执行
  onMounted(() => {
    formData.city = route.query.city
    formData.budget = route.query.budget
    formData.days = route.query.days
    if(formData.city && formData.budget && formData.days) {
      fetchTripData()
    }
  })


</script>

<style scoped>
.overview-card {
  margin-bottom: 16px;
}
.page-header{
  height:46px;
}
.trip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trip-header h2 {
  font-size: 20px;
  color: #323233;
  margin: 0;
}

.trip-budget {
  font-size: 16px;
  color: #ee0a24;
  font-weight: 600;
}

.trip-collapse {
  margin-bottom: 16px;
}

.day-schedule {
  padding: 8px 0;
}

.schedule-section {
  margin-bottom: 16px;
}

.schedule-section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 8px;
}

.section-label.morning {
  background: #fff7e6;
  color: #fa8c16;
}

.section-label.afternoon {
  background: #e6f7ff;
  color: #1890ff;
}

.section-label.evening {
  background: #f6ffed;
  color: #52c41a;
}

.budget-card,
.tips-card,
.warnings-card {
  margin-bottom: 16px;
  margin-top: 16px;
}

.tips-list,
.warnings-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li,
.warnings-list li {
  padding: 8px 0;
  color: #666;
  font-size: 14px;
  border-bottom: 1px solid #f5f5f5;
}

.tips-list li:last-child,
.warnings-list li:last-child {
  border-bottom: none;
}

.detail-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  max-width: 750px;
  margin: 0 auto;
}

.error-card {
  text-align: center;
  padding: 40px 16px;
}
</style>
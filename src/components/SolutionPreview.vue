<script setup>
import {
  BASE_DEPEND_TYPE,
  HIGHT_ORDER_TYPE,
  createDepend,
  SolutionLiveReload,
  createMockRequest,
  delay
} from '../lib'
import { 
  ref,
  reactive,
  onBeforeMount,
  computed
} from 'vue'

const disconnected = ref(false)
const depends = reactive([])
const solutionLiveReload = new SolutionLiveReload({maxCount: 3})

const SolutionDepend = computed(() => {
  return depends.reduce((dependMap, depend) => {
    dependMap[+(depend.configType === BASE_DEPEND_TYPE)].push(depend)
    return dependMap
  }, [[], []])
})

const handleCleanDepends = () => {
  depends.length = 0
}

const handleCreateDepend = (type) => {
  let configDepend = []
  if (!type) {
    const randomFlag = Math.random() * 10 % 2 | 0
    type = randomFlag ? BASE_DEPEND_TYPE : HIGHT_ORDER_TYPE
  }
  if (type === HIGHT_ORDER_TYPE) {
    configDepend = Array((Math.random() * 3 + 1 | 0)).fill(0).map(() => createDepend(BASE_DEPEND_TYPE))
  }
  const dep = 
  depends.push(createDepend(type, configDepend))
  // console.log('[SolutionDepend]', SolutionDepend)
}

const handleChangeDepend = (depend) => {
  if (depends.includes(depend)) solutionLiveReload.add(depend)
}

// 生成依赖
onBeforeMount(() => {
  Array(6).fill(0).map(() => handleCreateDepend())
  solutionLiveReload.feedback((requestData) => {
    console.log(`[正在发起请求，网络状态：${disconnected.value ? '异常' : '正常'}]`, {requestData})
    // return createMockRequest()
    return new Promise((resolve, reject) => {
      delay(3000, () => {
        const exec = disconnected.value ? reject : resolve
        exec(disconnected.value)
        if (!disconnected.value) console.log(`[请求得到响应，网络状态：${disconnected.value ? '异常' : '正常'}]`, {requestData, message: 'OK'})
      })
    })
  })
})
</script>

<template>
  <div class="solution-preview">
    <div class="solution-preview__operational">
      <span class="total">
        依赖总数：{{depends.length || 0}}
      </span>
      <button
        class="operational-item"
        @click="handleCreateDepend()">随机生成依赖{{BASE_DEPEND_TYPE}}</button>
      <button
        class="operational-item"
        @click="handleCreateDepend(BASE_DEPEND_TYPE)">生成基础依赖</button>
      <button
        class="operational-item"
        @click="handleCreateDepend(HIGHT_ORDER_TYPE)">生成高阶依赖</button>
      <button
        class="operational-item"
        @click="handleCleanDepends">清空依赖</button>
      <button
        class="operational-item"
        @click="disconnected = !disconnected">{{disconnected ? '打开' : '关闭'}}网络</button>
    </div>
    <div class="solution-preview__interaction">
      <div class="config__wrap base-config__wrap">
        <span
          class="config-item base-config"
          v-for="depend in SolutionDepend[1]"
          @click="handleChangeDepend(depend)"
          :class="{active: depend.__isActive}"
          :title="`BASE_${depend.id}`"
          :key="depend.id">BASE_{{depend.id}}</span>
      </div>
      <div class="config__wrap hight-config__wrap">
        <div
          class="config-item hight-config"
          v-for="depend in SolutionDepend[0]"
          @click="handleChangeDepend(depend)"
          :class="{active: depend.__isActive}"
          :title="`HIGHT_${depend.id}`"
          :key="depend.id">
          <span class="hight-config__title">HIGHT_{{depend.id}}</span>
          <div class="hight-config__depends">
            <span
              class="config-item base-config"
              v-for="subDepend in depend.depends"
              @click="subDepend.isActive = subDepend.__isActive = true"
              :class="{active: subDepend.__isActive}"
              :title="`BASE_${subDepend.id}`"
              :key="subDepend.id">BASE_{{subDepend.id}}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.solution-preview {
  &__operational {
    background: #333;
    padding: 20px 10px;
    .total {
      margin-right: 20px;
      color: #fff;
    }
    .operational-item {
      margin-right: 12px;
      padding: 4px 8px;
      border: 0;
      border-radius: 4px;
      cursor: pointer;
      background: #adadad;
      &:hover {
        background: #fff;
      }
    }
  }
  &__interaction {
    display: flex;
    justify-content: space-between;
    padding: 20px 12px;
    margin-top: 24px;
    color: #333;
    .config__wrap {
      display: flex;
      flex-wrap: wrap;
      height: fit-content;
    }
    .base-config__wrap {
      width: 25%;
    }
    .hight-config__wrap {
      width: 60%;
    }
    .config-item {
      display: block;
      padding: 8px 12px;
      margin: 8px;
      border: 1px solid #333;
      border-radius: 4px;
      cursor: pointer;
      transition: all .3s;
    }
    .base-config {
      &.active {
        background: #8685858f;
      }
    }
    .hight-config {
      &.active {
        background: #7777778c;
      }
      &__depends {
        padding: 12px;
        background: #e1e1e169;
      }
    }
  }
}
</style>

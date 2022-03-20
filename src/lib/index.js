
export const BASE_DEPEND_TYPE = 'BASE'
export const HIGHT_ORDER_TYPE = 'HIGHT'

const fps = 1000 / 60

const BASE_DEPEND = {
	configType: BASE_DEPEND_TYPE,
	isActive: false,
	__isActive: false
}

const HIGHT_ORDER_CONFIG = {
	configType: HIGHT_ORDER_TYPE,
	isActive: false,
	__isActive: false
}

const getId = () => Math.random().toString(36).slice(2)

const debounce = function (func, {wait, leading = false, trailing = true}) {
	return function (...arg) {
		if (!func.timeId && leading) {
			func.apply(this, arg)
		}
		if (func.timeId) clearTimeout(func.timeId)
		func.timeId = setTimeout(() => {
			if (trailing) func.apply(this, arg)
			clearTimeout(func.timeId)
			func.timeId = false
		}, wait || fps)
	}
}

export const createDepend = (type, depends = []) => {
	if (type === HIGHT_ORDER_TYPE) {
		return Object.assign({
			id: getId(),
			depends: depends.map(item => Object.assign(item, {
				hasParent: true
			}))
		}, HIGHT_ORDER_CONFIG)
	} else {
		return Object.assign({
			id: getId()
		}, BASE_DEPEND)
	}
}

export const delay = (delay, func, ...arg) => {
	return new Promise(resolve => {
		const timer = setTimeout(() => {
			const res = func && func(...arg)
			resolve(res || arg)
			clearTimeout(timer)
		}, delay || fps)
	})
}

export const createMockRequest = (func, ...arg) => (delay(3000)
	.then(() => {
		return func(...arg)
	}))

export class SolutionLiveReload {

	static clear (depends, exac) {
		while (depends.length) {
			const depend = depends.shift()
			if (exac instanceof Function) exac(depend)
		}
	}

	static DEFAULT_MAX_COUNT = 5

	constructor ({maxCount = 5}) {
		maxCount = maxCount >= 1 ? maxCount : SolutionLiveReload.DEFAULT_MAX_COUNT
		Object.assign(this, {
			depends: [],
			__depends: [],
			__maxCount: maxCount,
			maxCount
		})
	}

	INIT_FETCH_HEAD = Promise.resolve('INIT_FETCH_HEAD')

	feedback (feedbackCallback) {
		if (feedbackCallback instanceof Function) this.feedbackCallback = feedbackCallback
	}

	add (dep) {
		this.update()
		const {depends, __depends} = this
		if ([...depends, ...__depends].includes(dep)) return console.warn('该依赖已存在', {dep, depends, __depends})
		dep.isActive = true
		dep.__isActive = true
		depends.push(dep)
	}

	combine (depends, __depends, data = {}) {
		SolutionLiveReload.clear(depends, (dep) => {
			if (!__depends.includes(dep)) __depends.push(dep)
			const wrap = data[dep.configType]
			if (wrap) {
				data[dep.configType].push(dep)
				dep.isActive = false
				if (dep.configType === HIGHT_ORDER_TYPE) {
					SolutionLiveReload.clear([...dep.depends], (sDep) => {
						sDep.isActive = false
					})
				} 
			}
		})
	} 

	update = debounce(async function () {
		const {depends, __depends} = this
		// console.log(depends.length, __depends.length)
		// 防止发起多次请求
		if (this.depends.length && !this.__depends.length) return
		await Promise.resolve()
		const data = {
			[BASE_DEPEND_TYPE]: [],
			[HIGHT_ORDER_TYPE]: []
		}
		this.INIT_FETCH_HEAD
			.then((res) => {
				this.combine(depends, __depends, data)
				// console.log('INIT_FETCH_HEAD', res)
				this.INIT_FETCH_HEAD = this.feedbackCallback(data)
				.then((res) => {
					this.maxCount = this.__maxCount
					SolutionLiveReload.clear(__depends, (dep) => {
						if (dep.configType === BASE_DEPEND_TYPE) {
							dep.__isActive = false
						} else if (dep.configType === HIGHT_ORDER_TYPE) {
							SolutionLiveReload.clear([...dep.depends], (subDep) => {
								let isReload = (!subDep.isActive && subDep.__isActive)
								if (isReload) subDep.__isActive = false
							})
							const isActive = dep.depends.find(sDep => sDep.isActive || sDep.__isActive)
							Object.assign(dep, {
								isActive: !!isActive,
								__isActive: !!isActive
							})
							if (isActive) {
								Promise.resolve().then(() => {
									this.add(dep)
								})
							}
						}
					})
					if (depends.length) this.update()
					return res
				}, () => {
					if (!this.maxCount--) {
						console.log('网络不佳，下次继续')
						return Promise.resolve()
					}
					SolutionLiveReload.clear(__depends, (dep) => {
						if (dep.configType === BASE_DEPEND_TYPE) {
							dep.isActive = dep.__isActive
							this.add(dep)
						} else if (dep.configType === HIGHT_ORDER_TYPE) {
							SolutionLiveReload.clear([...dep.depends], (sDep) => {
								sDep.isActive = sDep.__isActive
							})
							dep.isActive = dep.__isActive = true
							this.add(dep)
						}
					})
					this.update()
				})
			})
	}, {leading: true, trailing: false, wait: 1000})
}
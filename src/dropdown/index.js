/**
 * Copyright (c) 2022 - present TinyVue Authors.
 * Copyright (c) 2022 - present Huawei Cloud Computing Technologies Co., Ltd.
 *
 * Use of this source code is governed by an MIT-style license.
 *
 * THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
 * BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
 * A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
 *
 */

import { KEY_CODE } from '@opentiny/vue-renderless/common'
import { addClass, removeClass, on, off } from '@opentiny/vue-renderless/common/deps/dom'

export const watchVisible = ({ broadcast, emit, nextTick }) => (value) => {
  broadcast('TinyDropdownMenu', 'visible', value)

  /**
   * 此处必须延时处理，不然 Vue3 环境下会从 nextTick 冒出一个错误：
   *
   * Uncaught (in promise) TypeError: Cannot read properties of null (reading 'length')
   *
   * 场景：visible-change 事件中，使用 Modal 静态方法
   */

  nextTick(() => emit('visible-change', value))
}

export const watchFocusing = ({ parent }) => (value) => {
  const selfDefine = parent.$el.querySelector('.tiny-dropdown-selfdefine')

  if (selfDefine) {
    value ? addClass(selfDefine, 'focusing') : removeClass(selfDefine, 'focusing')
  }
}

export const show = ({ props, state }) => () => {
  if (props.disabled) {
    return
  }

  clearTimeout(state.timeout)

  state.timeout = setTimeout(
    () => {
      state.visible = true
    },
    props.trigger === 'click' ? 0 : props.showTimeout
  )
}

export const hide = ({ api, props, state }) => () => {
  if (props.disabled) {
    return
  }

  api.removeTabindex()

  if (props.tabindex >= 0) {
    api.resetTabindex(state.triggerElm)
  }

  clearTimeout(state.timeout)

  state.timeout = setTimeout(
    () => {
      state.visible = false
    },
    props.trigger === 'click' ? 0 : props.hideTimeout
  )
}

export const handleClick = ({ api, props, state }) => () => {
  if (props.disabled) {
    return
  }

  state.visible ? api.hide() : api.show()
}

export const handleTriggerKeyDown = ({ api, state }) => (event) => {
  const keyCode = event.keyCode

  if (~[KEY_CODE.ArrowUp, KEY_CODE.ArrowDown].indexOf(keyCode)) {
    api.removeTabindex()
    api.resetTabindex(state.menuItems[0])
    state.menuItems[0].focus()

    event.preventDefault()
    event.stopPropagation()
  } else if (keyCode === KEY_CODE.Enter) {
    api.handleClick()
  } else if (~[KEY_CODE.Tab, KEY_CODE.Escape].indexOf(keyCode)) {
    api.hide()
  }
}

export const handleItemKeyDown = ({ api, props, state }) => (event) => {
  const keyCode = event.keyCode
  const target = event.target
  const currentIndex = state.menuItemsArray.indexOf(target)
  const max = state.menuItemsArray.length - 1

  let nextIndex

  if (~[KEY_CODE.ArrowUp, KEY_CODE.ArrowDown].indexOf(keyCode)) {
    if (keyCode === KEY_CODE.ArrowUp) {
      nextIndex = currentIndex !== 0 ? currentIndex - 1 : 0
    } else {
      nextIndex = currentIndex < max ? currentIndex + 1 : max
    }

    api.removeTabindex()
    api.resetTabindex(state.menuItems[nextIndex])
    state.menuItems[nextIndex].focus()

    event.preventDefault()
    event.stopPropagation()
  } else if (keyCode === KEY_CODE.Enter) {
    api.triggerElmFocus()

    target.click()

    if (props.hideOnClick) {
      state.visible = false
    }
  } else if (~[KEY_CODE.Tab, KEY_CODE.Escape].indexOf(keyCode)) {
    api.hide()
    api.triggerElmFocus()
  }
}

export const resetTabindex = ({ api }) => (el) => {
  api.removeTabindex()

  el.setAttribute('tabindex', '0')
}

export const removeTabindex = ({ state }) => () => {
  state.triggerElm.setAttribute('tabindex', '-1')
  state.menuItemsArray.forEach((item) => {
    item.setAttribute('tabindex', '-1')
  })
}

export const initAria = ({ state, props }) => () => {
  state.dropdownElm.setAttribute('id', state.listId)
  state.triggerElm.setAttribute('aria-haspopup', 'list')
  state.triggerElm.setAttribute('aria-controls', state.listId)

  if (!props.splitButton) {
    state.triggerElm.setAttribute('role', 'button')
    state.triggerElm.setAttribute('tabindex', props.tabindex)
    addClass(state.triggerElm, 'tiny-dropdown-selfdefine')
  }
}

const toggleFocus = ({ state, value }) => () => {
  state.focusing = value
}

export const initEvent = ({ api, props, state, vm }) => () => {
  state.triggerElm = props.splitButton ? vm.$refs.trigger.$el : vm.$refs.trigger

  on(state.triggerElm, 'keydown', api.handleTriggerKeyDown)
  state.dropdownElm.addEventListener('keydown', api.handleItemKeyDown, true)

  if (!props.splitButton) {
    on(state.triggerElm, 'focus', toggleFocus({ state, value: true }))
    on(state.triggerElm, 'blur', toggleFocus({ state, value: false }))
    on(state.triggerElm, 'click', toggleFocus({ state, value: false }))
  }

  if (props.trigger === 'hover') {
    on(state.triggerElm, 'mouseenter', api.show)
    on(state.triggerElm, 'mouseleave', api.hide)
    on(state.dropdownElm, 'mouseenter', api.show)
    on(state.dropdownElm, 'mouseleave', api.hide)
  } else if (props.trigger === 'click') {
    on(state.triggerElm, 'click', api.handleClick)
  }
}

export const handleMenuItemClick = ({ props, state, emit }) => (itemData, instance) => {
  if (props.hideOnClick) {
    state.visible = false
  }

  emit('item-click', itemData, instance)
}

export const triggerElmFocus = ({ state }) => () => {
  state.triggerElm.focus && state.triggerElm.focus()
}

export const initDomOperation = ({ api, state, vm }) => () => {
  state.dropdownElm = vm.popperElm
  state.menuItems = state.dropdownElm.querySelectorAll('[tabindex="-1"]')
  state.menuItemsArray = [].slice.call(state.menuItems)

  api.initEvent()
  api.initAria()
}

export const handleMainButtonClick = ({ api, emit }) => (event) => {
  emit('button-click', event)
  api.hide()
}

export const mounted = ({ api, vm }) => () => {
  vm.$on('menu-item-click', api.handleMenuItemClick)
}

export const beforeDistory = ({ api, state }) => () => {
  if (state.triggerElm) {
    off(state.triggerElm, 'keydown', api.handleTriggerKeyDown)
    off(state.triggerElm, 'focus', toggleFocus({ state, value: true }))
    off(state.triggerElm, 'blur', toggleFocus({ state, value: false }))
    off(state.triggerElm, 'click', toggleFocus({ state, value: false }))
    off(state.triggerElm, 'mouseenter', api.show)
    off(state.triggerElm, 'mouseleave', api.hide)
    off(state.triggerElm, 'click', api.handleClick)
    state.triggerElm = null
  }

  if (state.dropdownElm) {
    state.dropdownElm.removeEventListener('keydown', api.handleItemKeyDown, true)

    off(state.dropdownElm, 'mouseenter', api.show)
    off(state.dropdownElm, 'mouseleave', api.hide)

    state.dropdownElm = null
  }
}

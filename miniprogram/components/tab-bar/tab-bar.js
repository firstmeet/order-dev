Component({
  /**
   * 组件的属性列表
   */
  properties: {
    currentTab: {
      type: String,
      value: 'index'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    
  },

  /**
   * 组件的方法列表
   */
  methods: {
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      
      // 根据点击的标签页进行跳转
      switch (tab) {
        case 'index':
          wx.switchTab({ url: '/pages/index/index' });
          break;
        case 'publish':
          wx.navigateTo({ url: '/pages/publish/publish' });
          break;
        case 'my':
          wx.switchTab({ url: '/pages/my/my' });
          break;
      }
    }
  }
}) 
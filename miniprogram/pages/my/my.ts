// my.ts
import { checkLogin } from '../../utils/auth';
import { API } from '../../config/api';

const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

interface UserProfile {
  id: number;
  username: string;
  phone: string;
  avatar: string;
  wechat_open_id: string;
}

interface ProfileResponse {
  code: number;
  data: UserProfile;
  message: string;
}

const defaultUserProfile: UserProfile = {
  id: 0,
  username: '',
  phone: '',
  avatar: defaultAvatarUrl,
  wechat_open_id: ''
};

Component({
  data: {
    userProfile: defaultUserProfile,
    hasUserInfo: false,
    isLoading: true
  },

  lifetimes: {
    attached() {
      // 延迟执行以确保 app 实例已完全初始化
      setTimeout(() => {
        this.checkProfileAndLogin();
      }, 100);
    }
  },

  pageLifetimes: {
    show() {
      const app = getApp<IAppOption>();
      // 确保 app.globalData 已初始化
      if (!app || !app.globalData) {
        console.error('app.globalData not initialized');
        return;
      }
      this.checkProfileAndLogin();
    }
  },

  methods: {
    // 检查 profile 和登录状态
    async checkProfileAndLogin() {
      const app = getApp<IAppOption>();
      
      // 确保 app.globalData 已初始化
      if (!app || !app.globalData) {
        console.error('app.globalData not initialized');
        return;
      }

      this.setData({ isLoading: true });

      try {
        // 从本地存储获取 token
        const token = wx.getStorageSync('token') || app.globalData.token;
        
        // 如果本地存储和 globalData 都没有 token，则处理未登录状态
        if (!token) {
          this.handleNotLoggedIn();
          return;
        }

        // 更新 app.globalData.token
        app.globalData.token = token;

        // 请求 profile 接口
        const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult<ProfileResponse>>((resolve, reject) => {
          wx.request({
            url: API.USER.PROFILE,
            method: 'GET',
            header: {
              'Authorization': `Bearer ${token}`
            },
            success: resolve,
            fail: reject
          });
        });

        if (res.statusCode === 200 && res.data.code === 200) {
          // 更新用户信息
          const userProfile = res.data.data;
          // 更新全局状态中的用户信息
          app.globalData.userInfo = {
            nickName: userProfile.username,
            avatarUrl: userProfile.avatar,
            // 保持与 WechatMiniprogram.UserInfo 兼容的默认值
            gender: 0,
            language: 'zh_CN',
            city: '',
            province: '',
            country: ''
          };
          
          // 将用户信息保存到本地存储
          wx.setStorageSync('userInfo', app.globalData.userInfo);
          
          this.setData({
            userProfile,
            hasUserInfo: true,
            isLoading: false
          });
        } else {
          // profile 请求失败，清除登录状态并跳转登录页
          this.handleNotLoggedIn();
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
        this.handleNotLoggedIn();
      }
    },

    // 处理未登录状态
    handleNotLoggedIn() {
      const app = getApp<IAppOption>();
      if (app && app.globalData) {
        app.globalData.token = '';
        app.globalData.userInfo = undefined;
      }
      
      // 清除本地存储
      wx.removeStorageSync('token');
      wx.removeStorageSync('userInfo');
      
      this.setData({
        userProfile: defaultUserProfile,
        hasUserInfo: false,
        isLoading: false
      });

      // 跳转到登录页
      wx.navigateTo({
        url: '/pages/login/login'
      });
    },

    // 导航到登录页
    navigateToLogin() {
      wx.navigateTo({
        url: '/pages/login/login'
      });
    },

    // 检查并确保登录状态
    ensureLogin(callback: () => void) {
      if (!this.data.hasUserInfo) {
        this.navigateToLogin();
        return false;
      }
      callback();
      return true;
    },

    // 导航到我的代练单
    navigateToMyTasks() {
      this.ensureLogin(() => {
        wx.navigateTo({
          url: '/pages/my-tasks/my-tasks'
        });
      });
    },

    // 导航到我的订单
    navigateToMyOrders() {
      this.ensureLogin(() => {
        wx.navigateTo({
          url: '/pages/my-orders/my-orders'
        });
      });
    },

    // 导航到我发布的
    navigateToMyPublish() {
      this.ensureLogin(() => {
        wx.navigateTo({
          url: '/pages/my-publish/my-publish'
        });
      });
    },

    // 导航到设置页面
    navigateToSettings() {
      this.ensureLogin(() => {
        wx.navigateTo({
          url: '/pages/settings/settings'
        });
      });
    },

    // 联系客服
    contactService() {
      this.ensureLogin(() => {
        wx.showModal({
          title: '联系客服',
          content: '如有问题请添加客服微信：your_service_wechat',
          showCancel: false,
          confirmText: '我知道了'
        });
      });
    },

    /**
     * 跳转到发布页面
     */
    navigateToPublish() {
      // 检查登录状态
      this.ensureLogin(() => {
        wx.navigateTo({
          url: '/pages/publish/publish'
        });
      });
    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {
      // 检查登录状态
      this.checkLoginStatus();
      
      // 获取用户信息
      this.getUserProfile();
      
      // 隐藏官方的tabBar
      wx.hideTabBar({});
    },
    
    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {
      // 恢复官方的tabBar
      wx.showTabBar({});
    },

    // 检查登录状态
    checkLoginStatus() {
      // Implementation of checkLoginStatus method
    },

    // 获取用户信息
    getUserProfile() {
      // Implementation of getUserProfile method
    }
  }
}); 
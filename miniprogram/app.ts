// app.ts
import { initLoginStatus } from './utils/auth';

// 扩展IAppOption接口，添加我们需要的全局数据
interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo;
    token?: string;
    isLoggedIn?: boolean;
  };
}

// Define the app instance
const appInstance = App<IAppOption>({
  globalData: {
    userInfo: undefined,
    token: '',
    isLoggedIn: false
  },
  
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 检查登录状态
    initLoginStatus().then(isValid => {
      if (!isValid) {
        console.log('Token无效，需要重新登录');
      }
    });
  }
});
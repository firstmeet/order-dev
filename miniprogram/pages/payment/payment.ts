import { checkLogin } from '../../utils/auth';
import { API } from '../../config/api';

// 定义游戏服务器接口
interface GameServer {
  id: number;
  game_id: number;
  name: string;
  code: string;
}

// 定义任务项接口
interface OrderTask {
  game_item_id: number;
  task_type: string;
  price_spec_id: number;
  count: number;
}

// 定义订单详情接口
interface OrderDetail {
  id: number;
  game_account: string;
  game_server_id: number;
  game_server: GameServer;
  character_name: string;
  subtotal: number;
  tasks: OrderTask[];
}

// 定义订单接口
interface Order {
  id: number;
  order_number: string;
  total_price: string;
  status: string;
  details: OrderDetail[];
}

// 定义API响应接口
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

Page({
  data: {
    orderId: 0,
    order: null as Order | null,
    isLoading: true
  },

  onLoad(options) {
    // 检查登录状态
    checkLogin();
    
    // 获取订单ID
    const { orderId } = options;
    if (!orderId) {
      wx.showToast({
        title: '订单ID不能为空',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ 
      orderId: Number(orderId)
    });
    
    this.loadOrderDetail();
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },

  // 加载订单详情
  async loadOrderDetail() {
    const { orderId } = this.data;
    
    try {
      const token = wx.getStorageSync('token');
      
      // 模拟API响应数据（仅用于测试）
      const mockResponse = {
        code: 200,
        data: {
          id: orderId,
          order_number: `ORD2023031500${orderId}`,
          total_price: '210.00',
          status: 'pending',
          details: [
            {
              id: 4,
              game_account: 'user123',
              game_server_id: 3,
              game_server: {
                id: 3,
                game_id: 3,
                name: '电五双梦',
                code: '双梦'
              },
              character_name: '江湖侠客',
              subtotal: 210,
              tasks: [
                {
                  game_item_id: 4,
                  task_type: '日常任务',
                  price_spec_id: 21,
                  count: 2
                }
              ]
            }
          ]
        },
        message: 'success'
      };
      
      // 使用真实API或模拟数据
      let responseData;
      
      try {
        const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
          wx.request({
            url: `${API.ORDER.DETAIL}${orderId}`,
            method: 'GET',
            header: {
              'Authorization': `Bearer ${token}`
            },
            success: (result) => {
              resolve(result);
            },
            fail: (error) => {
              reject(error);
            }
          });
        });

        responseData = res.data as ApiResponse<Order>;
      } catch (error) {
        console.warn('API请求失败，使用模拟数据:', error);
        responseData = mockResponse;
      }

      if (responseData.code === 200) {
        this.setData({
          order: responseData.data,
          isLoading: false
        });
      } else {
        throw new Error(responseData.message || '获取订单详情失败');
      }
    } catch (error) {
      console.error('获取订单详情失败:', error);
      wx.showToast({
        title: '获取订单详情失败',
        icon: 'none'
      });
      this.setData({
        isLoading: false
      });
    }
  },

  // 处理支付
  async handlePayment() {
    const { orderId } = this.data;
    
    try {
      // 模拟支付过程
      wx.showLoading({
        title: '支付处理中...',
        mask: true
      });
      
      // 延迟2秒，模拟支付过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 假设支付成功
      wx.hideLoading();
      
      wx.showModal({
        title: '支付成功',
        content: '您的订单已支付成功！',
        showCancel: false,
        success: () => {
          // 设置前一页面的刷新标志
          const pages = getCurrentPages();
          if (pages.length > 1) {
            const prevPage = pages[pages.length - 2];
            if (prevPage && prevPage.data) {
              prevPage.setData({
                needRefresh: true
              });
            }
          }
          
          // 返回上一页
          wx.navigateBack();
        }
      });
    } catch (error) {
      console.error('支付失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '支付失败，请重试',
        icon: 'none'
      });
    }
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '如有问题请添加客服微信：your_service_wechat',
      showCancel: false,
      confirmText: '我知道了'
    });
  }
}); 
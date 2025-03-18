// order-detail.ts
import { checkLogin } from '../../utils/auth';
import { API } from '../../config/api';

// 定义卖家接口
interface Seller {
  id: number;
  username: string;
  avatar: string;
  phone: string;
}

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
  spec_name: string;
  price: number;
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
  user_id: number;
  task_id: number;
  game: string;
  task_type: string;
  status: string;
  status_text?: string;
  total_price: string;
  created_at: string;
  payment_time?: string;
  completion_time?: string;
  details: OrderDetail[];
  seller?: Seller;
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
    isLoading: true,
    needRefresh: false
  },

  onLoad(options) {
    // 检查登录状态
    checkLogin();
    
    // 获取订单ID
    const { id } = options;
    if (!id) {
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
      orderId: Number(id)
    });
    
    this.loadOrderDetail();
  },

  onShow() {
    // 隐藏官方的tabBar
    wx.hideTabBar({});
    
    // 检查是否需要刷新
    if (this.data.needRefresh) {
      this.setData({
        needRefresh: false
      });
      this.loadOrderDetail();
    }
  },

  onHide() {
    // 恢复官方的tabBar
    wx.showTabBar({});
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
          user_id: 1,
          task_id: 1,
          game: '剑网3',
          task_type: '日常任务',
          status: 'pending',
          total_price: '210.00',
          created_at: '2023-03-15 15:30:45',
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
          ],
          seller: {
            id: 2,
            username: '专业代练',
            avatar: '/assets/images/default-avatar.png',
            phone: '13800138000'
          }
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
        // 格式化订单状态文本
        let statusText = '';
        
        switch (responseData.data.status) {
          case 'pending':
            statusText = '待付款';
            break;
          case 'processing':
            statusText = '进行中';
            break;
          case 'completed':
            statusText = '已完成';
            break;
          case 'cancelled':
            statusText = '已取消';
            break;
          default:
            statusText = '未知状态';
        }
        
        this.setData({
          order: {
            ...responseData.data,
            status_text: statusText
          },
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

  // 取消订单
  async cancelOrder() {
    const { orderId } = this.data;
    
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const token = wx.getStorageSync('token');
            
            const result = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
              wx.request({
                url: `${API.ORDER.CANCEL}${orderId}/cancel`,
                method: 'POST',
                header: {
                  'Authorization': `Bearer ${token}`
                },
                success: (res) => {
                  resolve(res);
                },
                fail: (error) => {
                  reject(error);
                }
              });
            });
            
            const responseData = result.data as { code: number; message: string };
            
            if (result.statusCode === 200 && responseData.code === 200) {
              wx.showToast({
                title: '订单已取消',
                icon: 'success'
              });
              
              // 设置上一页需要刷新的标记
              const pages = getCurrentPages();
              if (pages.length >= 2) {
                const prevPage = pages[pages.length - 2];
                prevPage.setData({
                  needRefresh: true
                });
              }
              
              // 重新加载订单详情
              this.loadOrderDetail();
            } else {
              throw new Error(responseData.message || '取消订单失败');
            }
          } catch (error) {
            console.error('取消订单失败:', error);
            wx.showToast({
              title: '取消订单失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 支付订单
  payOrder() {
    const { orderId } = this.data;
    
    wx.navigateTo({
      url: `/pages/payment/payment?orderId=${orderId}`
    });
  },

  // 联系卖家
  contactSeller() {
    const { order } = this.data;
    
    if (order && order.seller) {
      wx.showModal({
        title: '联系卖家',
        content: `请通过以下方式联系卖家：\n电话：${order.seller.phone || '暂无'}\n微信：暂无`,
        showCancel: false
      });
    } else {
      wx.showToast({
        title: '卖家信息不可用',
        icon: 'none'
      });
    }
  },

  // 确认完成订单
  async confirmOrder() {
    const { orderId } = this.data;
    
    wx.showModal({
      title: '确认完成',
      content: '确认该订单已完成吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const token = wx.getStorageSync('token');
            
            const result = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
              wx.request({
                url: `${API.ORDER.COMPLETE}${orderId}/complete`,
                method: 'POST',
                header: {
                  'Authorization': `Bearer ${token}`
                },
                success: (res) => {
                  resolve(res);
                },
                fail: (error) => {
                  reject(error);
                }
              });
            });
            
            const responseData = result.data as { code: number; message: string };
            
            if (result.statusCode === 200 && responseData.code === 200) {
              wx.showToast({
                title: '订单已完成',
                icon: 'success'
              });
              
              // 设置上一页需要刷新的标记
              const pages = getCurrentPages();
              if (pages.length >= 2) {
                const prevPage = pages[pages.length - 2];
                prevPage.setData({
                  needRefresh: true
                });
              }
              
              // 重新加载订单详情
              this.loadOrderDetail();
            } else {
              throw new Error(responseData.message || '确认完成失败');
            }
          } catch (error) {
            console.error('确认完成失败:', error);
            wx.showToast({
              title: '确认完成失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 删除订单
  async deleteOrder() {
    const { orderId } = this.data;
    
    wx.showModal({
      title: '删除订单',
      content: '确定要删除该订单吗？删除后将无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            const token = wx.getStorageSync('token');
            
            const result = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
              wx.request({
                url: `${API.ORDER.DELETE}${orderId}`,
                method: 'DELETE',
                header: {
                  'Authorization': `Bearer ${token}`
                },
                success: (res) => {
                  resolve(res);
                },
                fail: (error) => {
                  reject(error);
                }
              });
            });
            
            const responseData = result.data as { code: number; message: string };
            
            if (result.statusCode === 200 && responseData.code === 200) {
              wx.showToast({
                title: '订单已删除',
                icon: 'success'
              });
              
              // 设置上一页需要刷新的标记
              const pages = getCurrentPages();
              if (pages.length >= 2) {
                const prevPage = pages[pages.length - 2];
                prevPage.setData({
                  needRefresh: true
                });
              }
              
              // 返回上一页
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } else {
              throw new Error(responseData.message || '删除订单失败');
            }
          } catch (error) {
            console.error('删除订单失败:', error);
            wx.showToast({
              title: '删除订单失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
}); 
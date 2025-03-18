// my-orders.ts
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
  game_name: string;
  task_type: string;
  status: string;
  status_text?: string;
  total_price: string;
  created_at: string;
  details: OrderDetail[];
}

// 定义API响应接口
interface ApiResponse<T> {
  code: number;
  data: {
    orders: T[];
    pagination: {
      current_page: number;
      page_size: number;
      total: number;
      total_pages: number;
    }
  };
  message: string;
}

Page({
  data: {
    orders: [] as Order[],
    currentStatus: '', // 空字符串表示全部
    page: 1,
    limit: 10,
    hasMore: true,
    isLoading: false,
    needRefresh: false
  },

  onLoad() {
    // 检查登录状态
    checkLogin();
    
    // 加载订单列表
    this.loadOrders();
  },

  onShow() {
    // 隐藏官方的tabBar
    wx.hideTabBar({});
    
    // 如果从订单详情页返回，刷新订单列表
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    // 检查是否有needRefresh标记
    if (currentPage.data.needRefresh) {
      console.log('需要刷新订单列表');
      this.setData({
        page: 1,
        orders: [],
        hasMore: true,
        needRefresh: false
      });
      this.loadOrders();
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

  // 切换订单状态
  changeStatus(e: WechatMiniprogram.CustomEvent) {
    const status = e.currentTarget.dataset.status;
    
    if (status !== this.data.currentStatus) {
      this.setData({
        currentStatus: status,
        orders: [],
        page: 1,
        hasMore: true
      });
      
      this.loadOrders();
    }
  },

  // 加载订单列表
  async loadOrders() {
    if (this.data.isLoading || !this.data.hasMore) return;
    
    this.setData({ isLoading: true });
    
    try {
      const token = wx.getStorageSync('token');
      const { currentStatus, page, limit } = this.data;
      
      // 模拟API响应数据（仅用于测试）
      const mockResponse = {
        code: 200,
        data: {
          orders: [
            {
              id: 1,
              order_number: 'ORD20230315001',
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
              ]
            },
            {
              id: 2,
              order_number: 'ORD20230316001',
              user_id: 1,
              task_id: 2,
              game: '剑网3',
              task_type: '副本任务',
              status: 'completed',
              total_price: '150.00',
              created_at: '2023-03-16 10:20:30',
              details: [
                {
                  id: 5,
                  game_account: 'user123',
                  game_server_id: 3,
                  game_server: {
                    id: 3,
                    game_id: 3,
                    name: '电五双梦',
                    code: '双梦'
                  },
                  character_name: '江湖侠客',
                  subtotal: 150,
                  tasks: [
                    {
                      game_item_id: 5,
                      task_type: '副本任务',
                      price_spec_id: 22,
                      count: 1
                    }
                  ]
                }
              ]
            }
          ],
          pagination: {
            current_page: page,
            page_size: limit,
            total: 2,
            total_pages: 1
          }
        },
        message: 'success'
      };
      
      console.log('请求订单列表参数:', {
        url: API.ORDER.USER_ORDERS,
        status: currentStatus,
        page,
        page_size: limit
      });
      
      // 使用真实API或模拟数据
      let responseData;
      
      try {
        const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
          wx.request({
            url: API.ORDER.USER_ORDERS,
            method: 'GET',
            header: {
              'Authorization': `Bearer ${token}`
            },
            data: {
              status: currentStatus,
              page,
              page_size: limit
            },
            success: (result) => {
              console.log('订单列表API响应:', result);
              resolve(result);
            },
            fail: (error) => {
              console.error('订单列表API请求失败:', error);
              reject(error);
            }
          });
        });
        
        responseData = res.data as ApiResponse<Order>;
      } catch (error) {
        console.warn('API请求失败，使用模拟数据:', error);
        responseData = mockResponse;
      }
      
      console.log('解析后的响应数据:', responseData);

      if (responseData.code === 200) {
        // 确保data存在
        if (!responseData.data || !responseData.data.orders) {
          console.error('API返回数据格式不正确:', responseData);
          this.setData({
            orders: [],
            hasMore: false,
            isLoading: false
          });
          return;
        }
        
        const orderList = responseData.data.orders;
        const pagination = responseData.data.pagination;
        
        // 格式化订单状态文本
        const formattedList = orderList.map(order => {
          let statusText = '';
          
          switch (order.status) {
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
          
          return {
            ...order,
            status_text: statusText
          };
        });
        
        // 更新订单列表
        this.setData({
          orders: page === 1 ? formattedList as Order[] : [...this.data.orders, ...formattedList as Order[]],
          hasMore: page < pagination.total_pages
        });
      } else {
        throw new Error(responseData.message || '获取订单列表失败');
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      wx.showToast({
        title: '获取订单列表失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 加载更多订单
  loadMoreOrders() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.setData({
        page: this.data.page + 1
      });
      
      this.loadOrders();
    }
  },

  // 导航到订单详情页
  navigateToOrderDetail(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${id}`
    });
  },

  // 取消订单
  async cancelOrder(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const token = wx.getStorageSync('token');
            
            const result = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
              wx.request({
                url: `${API.ORDER.CANCEL}${id}/cancel`,
                method: 'PUT',
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
              
              // 重新加载订单列表
              this.setData({
                page: 1,
                orders: []
              });
              
              this.loadOrders();
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
  payOrder(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    console.log('支付订单', id);
    wx.navigateTo({
      url: `/pages/payment/payment?orderId=${id}`
    });
  },

  // 联系卖家
  contactSeller(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    
    // 查找对应的订单
    const order = this.data.orders.find(o => o.id === id);
    
    if (order) {
      wx.showModal({
        title: '联系卖家',
        content: '请通过以下方式联系卖家：\n电话：暂无\n微信：暂无',
        showCancel: false
      });
    }
  },

  // 确认完成订单
  confirmOrder(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认完成',
      content: '确认该订单已完成吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const token = wx.getStorageSync('token');
            
            const result = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
              wx.request({
                url: `${API.ORDER.COMPLETE}${id}`,
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
              
              // 重新加载订单列表
              this.setData({
                page: 1,
                orders: []
              });
              
              this.loadOrders();
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
  deleteOrder(e: WechatMiniprogram.CustomEvent) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '删除订单',
      content: '确定要删除该订单吗？删除后将无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            const token = wx.getStorageSync('token');
            
            const result = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
              wx.request({
                url: `${API.ORDER.DELETE}${id}`,
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
              
              // 方法1：从当前列表中移除已删除的订单
              const updatedOrders = this.data.orders.filter(order => order.id !== id);
              this.setData({
                orders: updatedOrders
              });
              
              // 方法2：如果列表为空或者需要重新加载第一页，则重新请求数据
              if (updatedOrders.length === 0 && this.data.page > 1) {
                this.setData({
                  page: 1,
                  hasMore: true
                });
                this.loadOrders();
              }
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
/**
 * API配置
 */

// API基础URL
const API_BASE_URL = 'http://192.168.3.196:8080';

// API路径
export const API = {
  // 用户相关
  USER: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,                // 登录
    WECHAT_LOGIN: `${API_BASE_URL}/api/auth/wechat/login`,  // 微信登录
    PROFILE: `${API_BASE_URL}/api/user/profile`,            // 获取用户信息
    UPDATE_PROFILE: `${API_BASE_URL}/api/user/profile`,     // 更新用户信息
    UPDATE_PHONE: `${API_BASE_URL}/api/user/phone`,         // 更新手机号
  },
  
  // 代练单相关
  TASK: {
    CREATE: `${API_BASE_URL}/api/tasks`,               // 创建代练单
    DETAIL: `${API_BASE_URL}/api/tasks/`,              // 获取代练单详情 (需要拼接ID)
    USER_TASKS: `${API_BASE_URL}/api/user/tasks`,      // 获取用户的代练单列表
    CLOSE: `${API_BASE_URL}/api/tasks/`,               // 关闭代练单 (需要拼接ID + /close)
    LIST: `${API_BASE_URL}/api/tasks`,                 // 获取代练单列表
  },
  
  // 订单相关
  ORDER: {
    CREATE: `${API_BASE_URL}/api/orders`,              // 创建订单
    DETAIL: `${API_BASE_URL}/api/orders/`,             // 获取订单详情 (需要拼接ID)
    USER_ORDERS: `${API_BASE_URL}/api/user/orders`,    // 获取用户的订单列表
    TASK_ORDERS: `${API_BASE_URL}/api/task-orders/`,   // 获取代练单的订单列表 (需要拼接task_id)
    UPDATE_STATUS: `${API_BASE_URL}/api/orders/`,      // 更新订单状态 (需要拼接ID + /status)
    CLOSE: `${API_BASE_URL}/api/orders/`,              // 关闭订单 (需要拼接ID + /close)
    LIST: `${API_BASE_URL}/api/orders`,                // 获取订单列表
    CANCEL: `${API_BASE_URL}/api/orders/`,             // 取消订单 (需要拼接ID + /cancel)
    COMPLETE: `${API_BASE_URL}/api/orders/`,           // 完成订单 (需要拼接ID + /complete)
    DELETE: `${API_BASE_URL}/api/orders/`              // 删除订单 (需要拼接ID)
  },
  
  // 健康检查
  HEALTH: `${API_BASE_URL}/health`,                    // 健康检查

  // 游戏相关
  GAMES: {
    LIST: `${API_BASE_URL}/api/games`,
    DETAIL: `${API_BASE_URL}/api/games/:id`
  },
};

// 导出默认配置
export default {
  API_BASE_URL,
  API
}; 
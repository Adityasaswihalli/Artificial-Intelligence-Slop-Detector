import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
});

// MOCK ADAPTER FOR VERCEL DEPLOYMENT
// When deployed to Vercel without a backend, this will simulate all API responses.
if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_API_URL) {
  const mockUser = {
    _id: '64f1a2b3c4d5e6f7g8000000',
    username: 'demo_user',
    email: 'demo@example.com',
    plan: 'premium',
    createdAt: new Date().toISOString(),
  };

  api.defaults.adapter = async (config) => {
    const url = config.url || '';
    
    // Slight delay to simulate network
    await new Promise(resolve => setTimeout(resolve, 800));

    const okResponse = (data) => Promise.resolve({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {}
    });

    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      return okResponse({
        success: true,
        user: mockUser,
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        extensionToken: 'mock_extension_token'
      });
    }

    if (url.includes('/auth/me')) {
      // Check for token to simulate auth guard
      if (!config.headers.Authorization) {
        return Promise.reject({ response: { status: 401 }, config });
      }
      return okResponse({ success: true, user: mockUser });
    }

    if (url.includes('/analyze/stats')) {
      return okResponse({
        success: true,
        stats: {
          total: 1284,
          avgSlopScore: 78,
          recentTrend: [
            { _id: 'Mon', avgScore: 42, count: 120 }, { _id: 'Tue', avgScore: 58, count: 156 },
            { _id: 'Wed', avgScore: 48, count: 140 }, { _id: 'Thu', avgScore: 73, count: 180 },
            { _id: 'Fri', avgScore: 88, count: 210 }, { _id: 'Sat', avgScore: 65, count: 130 },
            { _id: 'Sun', avgScore: 92, count: 250 },
          ],
          classificationBreakdown: [
            { _id: 'clean', count: 250 }, { _id: 'low', count: 150 },
            { _id: 'medium', count: 320 }, { _id: 'high', count: 420 },
            { _id: 'critical', count: 144 },
          ]
        }
      });
    }

    if (url.includes('/dashboard/overview')) {
      return okResponse({
        success: true,
        overview: {
          recentAnalyses: [
            { _id: '64f1a2b3c4d5e6f7g8000001', platform: 'twitter', scores: { overall: 95 }, classification: 'critical', createdAt: new Date(Date.now() - 1000 * 60 * 5) },
            { _id: '64f1a2b3c4d5e6f7g8000002', platform: 'linkedin', scores: { overall: 82 }, classification: 'high', createdAt: new Date(Date.now() - 1000 * 60 * 45) },
            { _id: '64f1a2b3c4d5e6f7g8000003', platform: 'reddit', scores: { overall: 24 }, classification: 'clean', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) },
            { _id: '64f1a2b3c4d5e6f7g8000004', platform: 'facebook', scores: { overall: 55 }, classification: 'medium', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5) }
          ]
        }
      });
    }

    if (url.includes('/auth/logout')) {
      return okResponse({ success: true });
    }

    // Default 404 for unknown mocked routes
    return Promise.reject({
      response: { status: 404, data: { success: false, message: 'Mock Not Found' } },
      config
    });
  };
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefresh);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

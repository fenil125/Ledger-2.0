// API Client with JWT authentication
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));

    if (response.status === 401) {
      // Unauthorized - invalid/expired token
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    if (response.status === 403) {
      // Forbidden - valid token but insufficient permissions
      throw new Error(error.error || error.message || 'You do not have permission to perform this action');
    }

    throw new Error(error.error || error.message || 'API request failed');
  }
  return response.json();
};

class EntityClient {
  constructor(entityName, endpoint) {
    this.entityName = entityName;
    this.endpoint = endpoint;
  }

  async list(sort = null) {
    const url = new URL(`${API_BASE_URL}${this.endpoint}`);
    if (sort) url.searchParams.append('sort', sort);

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }

  async get(id) {
    const response = await fetch(`${API_BASE_URL}${this.endpoint}/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }

  async create(data) {
    const response = await fetch(`${API_BASE_URL}${this.endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  }

  async update(id, data) {
    const response = await fetch(`${API_BASE_URL}${this.endpoint}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  }

  async delete(id) {
    const response = await fetch(`${API_BASE_URL}${this.endpoint}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
}

export const base44 = {
  entities: {
    Transaction: new EntityClient('Transaction', '/api/transactions'),
    Party: new EntityClient('Party', '/api/parties'),
    User: new EntityClient('User', '/api/users'),
  },

  async exportCSV() {
    const response = await fetch(`${API_BASE_URL}/api/export`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },

  async getSummary() {
    const response = await fetch(`${API_BASE_URL}/api/reports/summary`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Party detail with transactions and payments
  async getPartyDetails(partyId) {
    const response = await fetch(`${API_BASE_URL}/api/parties/${partyId}/details`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Payment endpoints
  async createPayment(data) {
    const response = await fetch(`${API_BASE_URL}/api/payments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async getPayments(sellItemId) {
    const response = await fetch(`${API_BASE_URL}/api/payments?sellItemId=${sellItemId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Party payment endpoints (lump-sum payments)
  async createPartyPayment(data) {
    const response = await fetch(`${API_BASE_URL}/api/party-payments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async getPartyPayments(partyId) {
    const response = await fetch(`${API_BASE_URL}/api/party-payments?partyId=${partyId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async deletePartyPayment(id) {
    const response = await fetch(`${API_BASE_URL}/api/party-payments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Stats endpoints
  async getStatsSummary() {
    const response = await fetch(`${API_BASE_URL}/api/stats/summary`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getPartyStats() {
    const response = await fetch(`${API_BASE_URL}/api/parties/stats`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Notification endpoints
  async getNotifications() {
    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async getUnreadCount() {
    const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async markNotificationRead(id) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async markAllNotificationsRead() {
    const response = await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};

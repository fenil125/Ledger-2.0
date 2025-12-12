# Frontend Setup and Architecture

This document explains how the React frontend was created, configured, and how its components connect together.

---

## 🎨 Frontend Technology Stack

The frontend is a modern single-page application (SPA) built with **React 18** and **Vite**.

### Core Technologies

- **Framework**: React 18.2
- **Build Tool**: Vite 5.0
- **Routing**: React Router DOM v7
- **State Management**: TanStack Query (React Query) v5
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Forms**: React Hook Form, Date-fns, React Day Picker
- **Notifications**: Sonner (toast notifications)

---

## 🏗️ Frontend Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── base44Client.js      # API client with JWT auth
│   ├── components/
│   │   ├── dashboard/           # Transaction cards, charts, filters
│   │   ├── forms/               # Transaction, Party forms
│   │   └── ui/                  # Buttons, dialogs, inputs (Radix UI)
│   ├── context/
│   │   └── AuthContext.jsx      # Global auth state
│   ├── pages/
│   │   ├── Dashboard.jsx        # Transaction list, summary
│   │   ├── Parties.jsx          # Party management
│   │   ├── Reports.jsx          # Report generation
│   │   ├── Admin.jsx            # User management
│   │   ├── Login.jsx            # Authentication
│   │   └── Notifications.jsx    # Notification center
│   ├── lib/
│   │   └── utils.js             # Utility functions
│   ├── App.jsx                  # Route configuration
│   ├── Layout.jsx               # Sidebar, header, navigation
│   ├── main.jsx                 # Entry point
│   └── styles.css               # Global styles
├── index.html                   # HTML template
├── vite.config.mjs              # Vite configuration
├── tailwind.config.js           # Tailwind CSS config
├── package.json                 # Dependencies
└── .env                         # Environment variables
```

---

## 🚀 Application Initialization

### Entry Point: `main.jsx`

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### Provider Hierarchy

```
React.StrictMode
  └── BrowserRouter (React Router)
      └── QueryClientProvider (TanStack Query)
          └── AuthProvider (Custom Auth Context)
              └── App (Routes)
```

---

## 🛣️ Routing Configuration

### Route Structure: `App.jsx`

```javascript
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Parties from './pages/Parties';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import Notifications from './pages/Notifications';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Protected routes */}
      <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
```

### Route Protection

- **Public Routes**: `/login`
- **Protected Routes**: All other routes require authentication
- **Redirect Logic**: Unauthenticated users → `/login`, Authenticated users → `/`

---

## 🔐 Authentication System

### Auth Context: `context/AuthContext.jsx`

Provides global authentication state:

```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verify token and fetch user
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### Login Flow

1. User submits credentials at `/login`
2. Frontend sends POST to `/api/auth/login`
3. Backend validates and returns JWT token
4. Frontend stores token in localStorage
5. AuthContext updates `isAuthenticated` state
6. User redirected to dashboard
7. All subsequent API calls include token in headers

---

## 🌐 API Client

### HTTP Client: `api/base44Client.js`

Centralized API client with automatic JWT authentication:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
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
  
  async getSummary() {
    const response = await fetch(`${API_BASE_URL}/api/reports/summary`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
  
  async getNotifications() {
    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};
```

### API Client Features

- **Automatic JWT**: Adds `Authorization: Bearer <token>` to all requests
- **Error Handling**: Handles 401 (expired token) and 403 (forbidden) automatically
- **Type Safety**: Consistent interface for all entities
- **Centralized Config**: Single source of truth for API URL

---

## 📊 State Management

### Server State: TanStack Query

Used for data fetching, caching, and synchronization:

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '../api/base44Client';

function Dashboard() {
  const queryClient = useQueryClient();
  
  // Fetch transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list()
  });
  
  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction created successfully');
    }
  });
  
  const handleCreate = (data) => {
    createMutation.mutate(data);
  };
  
  return (
    <div>
      {isLoading ? <Spinner /> : <TransactionList data={transactions} />}
      <TransactionForm onSubmit={handleCreate} />
    </div>
  );
}
```

**Benefits:**
- Automatic caching
- Background refetching
- Optimistic updates
- Loading and error states
- Request deduplication

### Client State: React Context

Used for global UI state:

- **AuthContext**: User authentication state
- **ThemeContext**: Dark/light mode (if implemented)

### Local State: useState/useReducer

Used for component-specific state:

- Form inputs
- Modal open/close
- Filter selections
- UI toggles

---

## 🎨 Component Architecture

### Layout Component: `Layout.jsx`

Provides consistent layout for all pages:

```javascript
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### Page Components

Each page is a route-level component:

- **Dashboard.jsx**: Transaction list with filters and summary cards
- **Parties.jsx**: Party management with CRUD operations
- **Reports.jsx**: Report generation with date range selection
- **Admin.jsx**: User management (admin only)
- **Notifications.jsx**: Notification center with read/unread status

### Reusable Components

#### UI Components (`components/ui/`)

Built with Radix UI primitives:

- **Button**: Styled button with variants
- **Dialog**: Modal dialogs
- **Input**: Form inputs with validation
- **Select**: Dropdown selects
- **DatePicker**: Date selection with calendar
- **Card**: Content containers
- **Badge**: Status indicators

#### Dashboard Components (`components/dashboard/`)

- **TransactionTable**: Sortable, filterable transaction list
- **TransactionCard**: Individual transaction card
- **SummaryCards**: Buy/sell summary statistics
- **FilterBar**: Date range and type filters
- **Charts**: Visual data representation

#### Form Components (`components/forms/`)

- **TransactionForm**: Create/edit transactions
- **PartyForm**: Create/edit parties
- **BuyItemsForm**: Buy transaction items
- **SellItemsForm**: Sell transaction items

---

## 🎨 Styling System

### Tailwind CSS

Utility-first CSS framework for rapid UI development:

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
        }
      }
    }
  },
  plugins: []
}
```

### Global Styles: `styles.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700;
  }
}
```

### Component Styling

```javascript
function Button({ variant = 'primary', children, ...props }) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  
  return (
    <button 
      className={`px-4 py-2 rounded-lg ${variants[variant]}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

---

## 🔔 Notifications

### Toast Notifications: Sonner

```javascript
import { toast } from 'sonner';

function handleSubmit(data) {
  createMutation.mutate(data, {
    onSuccess: () => {
      toast.success('Transaction created successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}
```

### In-App Notifications

Notification center displays admin notifications:

```javascript
function Notifications() {
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.getNotifications()
  });
  
  const markReadMutation = useMutation({
    mutationFn: (id) => base44.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
  
  return (
    <div>
      {notifications?.map(notif => (
        <NotificationCard 
          key={notif.id}
          notification={notif}
          onMarkRead={() => markReadMutation.mutate(notif.id)}
        />
      ))}
    </div>
  );
}
```

---

## 🔧 Build Configuration

### Vite Configuration: `vite.config.mjs`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

**Features:**
- React plugin with Fast Refresh
- Path aliases (`@/components`)
- API proxy for development
- Hot module replacement (HMR)

---

## 🌍 Environment Configuration

Environment variables in `frontend/.env`:

```bash
# API URL
VITE_API_URL=http://localhost:4000

# For production
VITE_API_URL=https://api.yourapp.com
```

**Usage in code:**
```javascript
const API_URL = import.meta.env.VITE_API_URL;
```

---

## 🔄 How Frontend Components Connect

```
User Interaction
    ↓
React Component
    ↓
TanStack Query Hook (useQuery/useMutation)
    ↓
API Client (base44Client.js)
    ↓
HTTP Request with JWT Token
    ↓
Backend API
    ↓
Response Data
    ↓
TanStack Query Cache Update
    ↓
Component Re-render
    ↓
UI Update
```

---

## 📦 Package Scripts

Defined in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx"
  }
}
```

**Usage:**
- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

---

## 🚀 Development Workflow

1. **Start Development Server**:
   ```powershell
   cd frontend
   npm run dev
   ```

2. **Make Changes**: Edit components, Vite auto-reloads

3. **Test Features**: Use browser DevTools and React DevTools

4. **Build for Production**:
   ```powershell
   npm run build
   ```

5. **Preview Build**:
   ```powershell
   npm run preview
   ```

---

## ✅ Quick Start Checklist

- [ ] Install dependencies: `npm install`
- [ ] Configure `.env` with `VITE_API_URL`
- [ ] Ensure backend is running at API URL
- [ ] Start development server: `npm run dev`
- [ ] Open browser at `http://localhost:5173`
- [ ] Login with credentials (or create account)
- [ ] Test CRUD operations on transactions and parties

---

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Frontend Source Code](file:///c:/Users/fenil/OneDrive/Desktop/Side/frontend/src)

import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import type { User } from '../types';
import { Auth } from '../services';
import { getErrorMessage } from '../services/api';
import { ACCESS_TOKEN_KEY } from '../config/api';

// ─────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'LOGIN_SUCCESS'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADING':      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS': return { user: action.user, isAuthenticated: true, isLoading: false, error: null };
    case 'LOGOUT':       return { user: null, isAuthenticated: false, isLoading: false, error: null };
    case 'ERROR':        return { ...state, isLoading: false, error: action.error };
    case 'CLEAR_ERROR':  return { ...state, error: null };
    default:             return state;
  }
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────
interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true, // start loading to check existing session
    error: null,
  });

  // Rehydrate session on mount
  useEffect(() => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      dispatch({ type: 'LOGOUT' });
      return;
    }
    Auth.me()
      .then((user) => dispatch({ type: 'LOGIN_SUCCESS', user }))
      .catch(() => {
        sessionStorage.clear();
        dispatch({ type: 'LOGOUT' });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'LOADING' });
    try {
      const { user } = await Auth.login({ email, password });
      dispatch({ type: 'LOGIN_SUCCESS', user });
    } catch (err: unknown) {
      dispatch({ type: 'ERROR', error: getErrorMessage(err, 'Login failed. Please try again.') });
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, full_name: string, phone?: string) => {
    dispatch({ type: 'LOADING' });
    try {
      const { user } = await Auth.register({ email, password, full_name, phone });
      dispatch({ type: 'LOGIN_SUCCESS', user });
    } catch (err: unknown) {
      dispatch({ type: 'ERROR', error: getErrorMessage(err, 'Registration failed. Please try again.') });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await Auth.logout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

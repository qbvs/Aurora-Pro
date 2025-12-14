
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => { 
      if (localStorage.getItem('aurora_auth') === 'true') {
          setIsAuthenticated(true); 
      }
  }, []);

  const handleLogin = (password: string) => { 
      if (!process.env.ADMIN_PASSWORD || password === process.env.ADMIN_PASSWORD) { 
          setIsAuthenticated(true); 
          localStorage.setItem('aurora_auth', 'true'); 
          setIsEditMode(true); 
          return true;
      } 
      return false;
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      localStorage.removeItem('aurora_auth');
      setIsEditMode(false);
  };

  return { 
      isEditMode, setIsEditMode, 
      isAuthenticated, setIsAuthenticated, 
      handleLogin, handleLogout 
  };
};

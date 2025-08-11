// client/src/contexts/AuthContext.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import axios from 'axios';

const AuthContext = createContext (null);

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState (null);
  const [token, setToken] = useState (localStorage.getItem ('authToken'));

  useEffect (
    () => {
      const fetchUser = async () => {
        if (token) {
          try {
            const {data} = await axios.get ('/api/users/me', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            setUser (data);
          } catch (error) {
            console.error ('Session token is invalid, logging out.', error);
            logout ();
          }
        } else {
          setUser (null);
        }
      };

      fetchUser ();
    },
    [token]
  );

  const login = useCallback ((userData, token) => {
    localStorage.setItem ('authToken', token);
    setToken (token);
    setUser (userData);
  }, []);

  const logout = useCallback (() => {
    localStorage.removeItem ('authToken');
    setToken (null);
    setUser (null);
  }, []);

  const authContextValue = {
    user,
    token,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext (AuthContext);
  if (!context) {
    throw new Error ('useAuth must be used within an AuthProvider');
  }
  return context;
};

// client/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();
  const { token, login } = useAuth();

  useEffect(() => {
    if (token) {
      console.log('User is already logged in. Redirecting to /discover...');
      navigate('/discover');
    }
  }, [token, navigate]);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      });

      console.log('Login successful:', response.data);
      
      // --- CORRECTED LOGIC ---
      // Check for the user object inside response.data.data
      if (response.data.data.user && response.data.token) {
        login(response.data.data.user, response.data.token);
        navigate('/dashboard');
      } else {
         setError('Login response was invalid.');
      }
      
    } catch (err) {
      console.error(
        'Login error:',
        err.response ? err.response.data : err.message
      );
      setError(
        err.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-vav-content-card p-8 rounded-lg shadow-xl w-full text-vav-text"
      >
        <h2 className="text-3xl font-serif text-vav-accent-primary mb-6 text-center">
          Login
        </h2>
        {error &&
          <p className="text-red-500 text-sm mb-4 text-center bg-red-900 bg-opacity-30 p-2 rounded">
            {error}
          </p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="mb-4 p-3 text-base border border-vav-accent-primary rounded-md w-full bg-vav-background text-vav-text placeholder-vav-text-secondary focus:outline-none focus:ring-2 focus:ring-vav-accent-secondary"
          required
        />
        <div className="relative mb-6">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="p-3 text-base border border-vav-accent-primary rounded-md w-full bg-vav-background text-vav-text placeholder-vav-text-secondary focus:outline-none focus:ring-2 focus:ring-vav-accent-secondary"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-vav-text-secondary hover:text-vav-accent-primary"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <button
          type="submit"
          className="w-full bg-vav-accent-primary hover:bg-vav-accent-secondary text-vav-background font-semibold py-3 px-4 rounded-md shadow-md transition-colors duration-150 ease-in-out"
        >
          Login
        </button>
        <p className="mt-6 text-center text-sm text-vav-text-secondary">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-vav-accent-primary hover:text-vav-accent-secondary transition-colors"
          >
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
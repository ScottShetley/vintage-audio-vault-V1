// client/src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // <-- IMPORT ICONS

const SignupPage = ({ setToken }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // --- ADDED: State for password visibilities ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/register',
        {
          username,
          email,
          password,
        }
      );

      const receivedToken = response.data.token;
      console.log('Registration successful:', response.data);

      setToken(receivedToken);
      localStorage.setItem('authToken', receivedToken);

      console.log('Token stored, user logged in.');
      navigate('/dashboard');
    } catch (err) {
      console.error(
        'Registration error:',
        err.response ? err.response.data : err.message
      );
      setError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    }
  };

  const inputClass = "p-3 text-base border border-vav-accent-primary rounded-md w-full bg-vav-background text-vav-text placeholder-vav-text-secondary focus:outline-none focus:ring-2 focus:ring-vav-accent-secondary";

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-vav-content-card p-8 rounded-lg shadow-xl w-full text-vav-text"
      >
        <h2 className="text-3xl font-serif text-vav-accent-primary mb-6 text-center">
          Sign Up
        </h2>
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center bg-red-900 bg-opacity-30 p-2 rounded">
            {error}
          </p>
        )}

        <div className="mb-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div className="mb-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        
        {/* --- MODIFIED: Password input with toggle --- */}
        <div className="relative mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputClass}
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
        
        {/* --- MODIFIED: Confirm Password input with toggle --- */}
        <div className="relative mb-6">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className={inputClass}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-vav-text-secondary hover:text-vav-accent-primary"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-vav-accent-primary hover:bg-vav-accent-secondary text-vav-background font-semibold py-3 px-4 rounded-md shadow-md transition-colors duration-150 ease-in-out"
        >
          Sign Up
        </button>
        <p className="mt-6 text-center text-sm text-vav-text-secondary">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-vav-accent-primary hover:text-vav-accent-secondary transition-colors"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default SignupPage;
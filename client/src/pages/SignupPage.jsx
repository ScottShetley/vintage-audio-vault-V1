// client/src/pages/SignupPage.jsx
import React, {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import axios from 'axios';

// 1. Accept setToken as a prop
const SignupPage = ({setToken}) => {
  const [email, setEmail] = useState ('');
  const [password, setPassword] = useState ('');
  const [confirmPassword, setConfirmPassword] = useState ('');
  const [error, setError] = useState ('');
  // Success message is no longer needed
  const navigate = useNavigate ();

  const handleSubmit = async event => {
    event.preventDefault ();
    setError ('');

    if (password !== confirmPassword) {
      setError ('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError ('Password must be at least 6 characters long.');
      return;
    }

    try {
      const response = await axios.post (
        'http://localhost:5000/api/auth/register',
        {
          email,
          password,
        }
      );

      // 2. New success logic for automatic login
      const receivedToken = response.data.token;
      console.log ('Registration successful:', response.data);

      setToken (receivedToken);
      localStorage.setItem ('authToken', receivedToken);

      console.log ('Token stored, user logged in.');
      navigate ('/dashboard');
    } catch (err) {
      console.error (
        'Registration error:',
        err.response ? err.response.data : err.message
      );
      setError (
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : 'Registration failed. Please try again.'
      );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-vav-content-card p-8 rounded-lg shadow-xl w-full text-vav-text"
      >
        <h2 className="text-3xl font-serif text-vav-accent-primary mb-6 text-center">
          Sign Up
        </h2>
        {error &&
          <p className="text-red-500 text-sm mb-4 text-center bg-red-900 bg-opacity-30 p-2 rounded">
            {error}
          </p>}
        {/* The success message paragraph is removed from here */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail (e.target.value)}
          className="mb-4 p-3 text-base border border-vav-accent-primary rounded-md w-full bg-vav-background text-vav-text placeholder-vav-text-secondary focus:outline-none focus:ring-2 focus:ring-vav-accent-secondary"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword (e.target.value)}
          className="mb-4 p-3 text-base border border-vav-accent-primary rounded-md w-full bg-vav-background text-vav-text placeholder-vav-text-secondary focus:outline-none focus:ring-2 focus:ring-vav-accent-secondary"
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword (e.target.value)}
          className="mb-6 p-3 text-base border border-vav-accent-primary rounded-md w-full bg-vav-background text-vav-text placeholder-vav-text-secondary focus:outline-none focus:ring-2 focus:ring-vav-accent-secondary"
          required
        />
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

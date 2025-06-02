// client/src/pages/LoginPage.jsx
import React, {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom'; // Import useNavigate
import axios from 'axios'; // Import axios

const LoginPage = () => {
  const [email, setEmail] = useState ('');
  const [password, setPassword] = useState ('');
  const [error, setError] = useState (''); // State for error messages
  const navigate = useNavigate (); // Initialize navigate hook

  const handleSubmit = async event => {
    // Make handleSubmit async
    event.preventDefault ();
    setError (''); // Clear previous errors

    try {
      const response = await axios.post (
        'http://localhost:5000/api/auth/login',
        {
          // Make API call
          email,
          password,
        }
      );

      // Handle successful login
      console.log ('Login successful:', response.data);
      // Store the JWT token (e.g., in localStorage)
      localStorage.setItem ('token', response.data.token);
      // Redirect to a dashboard or collection page (we'll create this later)
      navigate ('/dashboard'); // Redirect to a placeholder dashboard route
    } catch (err) {
      // Handle login errors
      console.error (
        'Login error:',
        err.response ? err.response.data : err.message
      );
      setError (
        err.response && err.response.data && err.response.data.message
          ? err.response.data.message
          : 'Login failed. Please check your credentials.'
      );
    }
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f2f5',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      padding: '40px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      backgroundColor: 'white',
      width: '100%',
      maxWidth: '400px',
    },
    title: {
      marginBottom: '24px',
      color: '#333',
      textAlign: 'center',
    },
    input: {
      marginBottom: '16px',
      padding: '12px',
      fontSize: '16px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      boxSizing: 'border-box',
    },
    button: {
      padding: '12px',
      fontSize: '16px',
      color: 'white',
      backgroundColor: '#007bff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    // Note: Inline styles don't directly support :hover, this is illustrative
    // buttonHover is not directly used in inline styles here but kept for context if you switch to CSS classes.
    buttonHover: {
      backgroundColor: '#0056b3',
    },
    errorMessage: {
      // Style for error message
      color: 'red',
      marginBottom: '10px',
      textAlign: 'center',
      fontSize: '14px',
    },
    signupLink: {
      marginTop: '20px',
      textAlign: 'center',
      fontSize: '14px',
    },
    link: {
      color: '#007bff',
      textDecoration: 'none',
    },
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Login</h2>
        {error && <p style={styles.errorMessage}>{error}</p>}
        {' '}
        {/* Display error message */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail (e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword (e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button}>Login</button>
        <p style={styles.signupLink}>
          Don't have an account?
          {' '}
          <Link to="/signup" style={styles.link}>Sign Up</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;

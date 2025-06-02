// client/src/pages/SignupPage.jsx
import React, {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom'; // Import useNavigate
import axios from 'axios'; // Import axios

const SignupPage = () => {
  const [email, setEmail] = useState ('');
  const [password, setPassword] = useState ('');
  const [confirmPassword, setConfirmPassword] = useState ('');
  const [error, setError] = useState (''); // State for error messages
  const [successMessage, setSuccessMessage] = useState (''); // State for success message
  const navigate = useNavigate (); // Initialize navigate hook

  const handleSubmit = async event => {
    // Make handleSubmit async
    event.preventDefault ();
    setError (''); // Clear previous errors
    setSuccessMessage (''); // Clear previous success messages

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
          // Make API call
          email,
          password,
        }
      );

      // Handle successful registration
      console.log ('Registration successful:', response.data);
      setSuccessMessage ('Registration successful! Please log in.');
      // Optionally, clear form fields
      setEmail ('');
      setPassword ('');
      setConfirmPassword ('');
      // You might redirect to login page after a short delay
      setTimeout (() => {
        navigate ('/login');
      }, 2000); // Redirect after 2 seconds
    } catch (err) {
      // Handle registration errors
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
      backgroundColor: '#28a745', // A slightly different color for signup
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    errorMessage: {
      color: 'red',
      marginBottom: '10px',
      textAlign: 'center',
      fontSize: '14px',
    },
    successMessage: {
      // Style for success message
      color: 'green',
      marginBottom: '10px',
      textAlign: 'center',
      fontSize: '14px',
    },
    loginLink: {
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
        <h2 style={styles.title}>Sign Up</h2>
        {error && <p style={styles.errorMessage}>{error}</p>}
        {' '}
        {/* Display error message */}
        {successMessage &&
          <p style={styles.successMessage}>{successMessage}</p>}
        {' '}
        {/* Display success message */}
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
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword (e.target.value)}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button}>Sign Up</button>
        <p style={styles.loginLink}>
          Already have an account?
          {' '}
          <Link to="/login" style={styles.link}>Login</Link>
        </p>
      </form>
    </div>
  );
};

export default SignupPage;

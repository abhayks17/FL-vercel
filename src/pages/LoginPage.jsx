import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Factory, Lock, User, ShieldCheck } from 'lucide-react';
import { login as loginApi } from '../services/api';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await loginApi({
        username,
        password
      });
      
      const { token, user } = response;
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'worker' || user.role === 'operator') {
        navigate('/worker');
      } else {
        setError('Unauthorized role');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1rem'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            background: 'rgba(34, 211, 238, 0.1)',
            borderRadius: '1rem',
            marginBottom: '1rem'
          }}>
            <Factory size={40} className="text-cyan-400" color="#22d3ee" />
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>FactoryLog</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Industrial Data Interface</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Username" 
              className="input-field" 
              style={{ paddingLeft: '3rem' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              placeholder="Password" 
              className="input-field" 
              style={{ paddingLeft: '3rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', width: '100%' }}>
            {loading ? 'Authenticating...' : 'Secure Login'}
            {!loading && <ShieldCheck size={20} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;

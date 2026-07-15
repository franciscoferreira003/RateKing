import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './Register.css';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const result = await register(username, email, password);
    if (result.ok) {
      navigate('/');
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass p-8 rounded-3xl gold-glow">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl crown-animate inline-block">👑</span>
          <h2 className="text-3xl font-bold text-gold-gradient mt-2">RateKing</h2>
          <p className="text-white/50 text-sm mt-1">Join the kingdom</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4 text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="input"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full py-3 text-base">
            Register
          </button>
        </form>

        <p className="text-center mt-6 text-white/50 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
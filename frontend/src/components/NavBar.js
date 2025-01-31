import React from 'react';
import { NavLink } from 'react-router-dom';
import profileIcon from '../assets/icons/pf.png';
import './NavBar.css';

const Navbar = () => {
  return (
    <nav className="navbar-container">
      <li>
        <button className="navbar-button">
          <NavLink to="/profile" activeClassName="active">
          <img src={profileIcon} alt="profile" className="icon" />
          </NavLink>
        </button>
      </li>
      <li>
        <button className="navbar-button">
          <NavLink to="/chats" activeClassName="active">
            <span className="icon">💬</span>
          </NavLink>
        </button>
      </li>
      {/* Добавь другие кнопки по аналогии */}
    </nav>
  );
};

export default Navbar;

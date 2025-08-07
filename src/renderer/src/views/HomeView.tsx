import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import './HomeView.css';

const HomeView: React.FC = () => {
  const navigate = useNavigate();

  const homeButtons = [
    {
      title: 'Creación de usuarios',
      description: 'Crear y gestionar usuarios del sistema',
      icon: '👤',
      route: ROUTES.USERS,
      color: 'primary'
    },
    {
      title: 'Creación de Presupuestos',
      description: 'Crear y gestionar presupuestos',
      icon: '💰',
      route: ROUTES.BUDGETS,
      color: 'success'
    },
    {
      title: 'Vistas de usuarios',
      description: 'Ver y administrar lista de usuarios',
      icon: '👥',
      route: ROUTES.USERS,
      color: 'info'
    },
    {
      title: 'Vistas de Presupuestos',
      description: 'Ver y administrar lista de presupuestos',
      icon: '📊',
      route: ROUTES.BUDGETS,
      color: 'warning'
    }
  ];

  const handleButtonClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="home-view">
      <div className="home-container">
        <header className="home-header">
          <h1 className="home-title">Sistema Nova - Entorno de Pruebas</h1>
          <p className="home-subtitle">
            Selecciona una opción para comenzar a probar las funcionalidades del sistema
          </p>
        </header>

        <div className="home-buttons-grid">
          {homeButtons.map((button, index) => (
            <button
              key={index}
              className={`home-button home-button-${button.color}`}
              onClick={() => handleButtonClick(button.route)}
              aria-label={button.title}
            >
              <div className="home-button-icon">
                {button.icon}
              </div>
              <div className="home-button-content">
                <h3 className="home-button-title">{button.title}</h3>
                <p className="home-button-description">{button.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeView;
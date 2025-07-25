// Pruebas paso a paso para IPC
// Copia y pega cada sección una a la vez en la consola de DevTools

// Paso 1: Probar conexión básica de IPC
console.log('Probando conexión básica de IPC...')
window.electron.ipcRenderer.send('ping')

// Paso 2: Probar creación de intereses (esto debería funcionar primero)
console.log('Probando creación de intereses...')
const testInterest = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('interest:createDefaults')
    console.log('Resultado de creación de intereses:', result)
    return result
  } catch (error) {
    console.error('Error en creación de intereses:', error)
    return { error: error.message }
  }
}

// Paso 3: Probar creación de usuario
const testUser = async () => {
  try {
    const userData = {
      nombre: 'Usuario de Prueba',
      email: 'prueba@ejemplo.com',
      password: 'Killinginthename777',
      phoneNumber: '123456789'
    }
    console.log(userData)
    const result = await window.electron.ipcRenderer.invoke('user:create', userData)
    console.log('Resultado de creación de usuario:', result)
    return result
  } catch (error) {
    console.error('Error en creación de usuario:', error)
    return { error: error.message }
  }
}

// Paso 4: Probar obtener todos los usuarios
const testGetUsers = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('user:getAll')
    console.log('Resultado de obtener usuarios:', result)
    return result
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return { error: error.message }
  }
}

// Paso 5: Probar obtener todos los intereses
const testGetInterests = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('interest:getAll')
    console.log('Resultado de obtener intereses:', result)
    return result
  } catch (error) {
    console.error('Error al obtener intereses:', error)
    return { error: error.message }
  }
}

// Paso 6: Probar creación de presupuesto (necesita ID de usuario válido)
const testCreateBudget = async (userId) => {
  try {
    const budgetData = {
      _expirationDate: new Date('2025-12-31'),
      baseAmount: 1000,
      paymentTerm: 12,
      userId: userId
    }
    const result = await window.electron.ipcRenderer.invoke('budget:create', budgetData)
    console.log('Resultado de creación de presupuesto:', result)
    return result
  } catch (error) {
    console.error('Error en creación de presupuesto:', error)
    return { error: error.message }
  }
}

// Paso 7: Probar búsqueda de usuario por email
const testSearchUserByEmail = async (email = 'prueba@ejemplo.com') => {
  try {
    const result = await window.electron.ipcRenderer.invoke('user:searchByEmail', email)
    console.log('Resultado de búsqueda por email:', result)
    return result
  } catch (error) {
    console.error('Error en búsqueda por email:', error)
    return { error: error.message }
  }
}

// Paso 8: Probar búsqueda de presupuesto por código
const testSearchBudgetByCode = async (code = 'BUD-001') => {
  try {
    const result = await window.electron.ipcRenderer.invoke('budget:searchByCode', code)
    console.log('Resultado de búsqueda por código:', result)
    return result
  } catch (error) {
    console.error('Error en búsqueda por código:', error)
    return { error: error.message }
  }
}

// Prueba completa secuencial
const runFullTest = async () => {
  console.log('=== Iniciando Prueba Completa de IPC ===')

  try {
    // 1. Crear configuraciones de interés por defecto
    console.log('1. Creando configuraciones de interés por defecto...')
    await testInterest()

    // 2. Crear un usuario
    console.log('2. Creando un usuario...')
    const userResult = await testUser()
    const userId = userResult.success ? userResult.data.id : null

    if (!userId) {
      console.error('Falló la creación del usuario, deteniendo prueba')
      return
    }

    // 3. Obtener todos los usuarios
    console.log('3. Obteniendo todos los usuarios...')
    await testGetUsers()

    // 4. Probar búsqueda de usuario
    console.log('4. Probando búsqueda de usuario...')
    await testSearchUserByEmail()

    // 5. Obtener todos los intereses
    console.log('5. Obteniendo todos los intereses...')
    await testGetInterests()

    // 6. Crear un presupuesto
    console.log('6. Creando un presupuesto...')
    const budgetResult = await testCreateBudget(userId)

    // 7. Obtener todos los presupuestos
    console.log('7. Obteniendo todos los presupuestos...')
    const budgetsResult = await window.electron.ipcRenderer.invoke('budget:getAll')
    console.log('Resultado de todos los presupuestos:', budgetsResult)

    // 8. Probar búsqueda de presupuesto
    if (budgetResult.success && budgetResult.data.code) {
      console.log('8. Probando búsqueda de presupuesto...')
      await testSearchBudgetByCode(budgetResult.data.code)
    }

    console.log('=== Prueba Completa Terminada ===')
  } catch (error) {
    console.error('La prueba falló:', error)
  }
}

// Instrucciones:
console.log('=== Instrucciones de Prueba IPC ===')
console.log('1. Ejecutar: testInterest()')
console.log('2. Ejecutar: testUser()')
console.log('3. Ejecutar: testGetUsers()')
console.log('4. Ejecutar: testGetInterests()')
console.log('5. Ejecutar: testCreateBudget(userId) - usar ID del paso 2')
console.log('6. Ejecutar: testSearchUserByEmail()')
console.log('7. Ejecutar: testSearchBudgetByCode()')
console.log('')
console.log('Para ejecutar todas las pruebas: runFullTest()')
console.log('')
console.log('Si algún paso falla, revisar la consola del proceso principal para errores')

// ===== FUNCIONES DE PRUEBA PARA AUTENTICACIÓN =====

// Funciones de prueba para autenticación
const testRegister = async () => {
  try {
    const registerData = {
      nombre: 'Usuario de Prueba Auth',
      email: 'auth@ejemplo.com',
      password: '123456',
      phoneNumber: '987654321'
    }
    const result = await window.electron.ipcRenderer.invoke('auth:register', registerData)
    console.log('Resultado de registro:', result)
    return result
  } catch (error) {
    console.error('Error en registro:', error)
    return { error: error.message }
  }
}

const testLogin = async (email = 'auth@ejemplo.com', password = '123456') => {
  try {
    const loginData = { email, password }
    const result = await window.electron.ipcRenderer.invoke('auth:login', loginData)
    console.log('Resultado de login:', result)
    return result
  } catch (error) {
    console.error('Error en login:', error)
    return { error: error.message }
  }
}

const testGetCurrentUser = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('auth:getCurrentUser')
    console.log('Usuario actual:', result)
    return result
  } catch (error) {
    console.error('Error obteniendo usuario actual:', error)
    return { error: error.message }
  }
}

const testIsAuthenticated = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('auth:isAuthenticated')
    console.log('¿Está autenticado?:', result)
    return result
  } catch (error) {
    console.error('Error verificando autenticación:', error)
    return { error: error.message }
  }
}

const testLogout = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('auth:logout')
    console.log('Resultado de logout:', result)
    return result
  } catch (error) {
    console.error('Error en logout:', error)
    return { error: error.message }
  }
}

const testChangePassword = async (currentPassword = '123456', newPassword = '654321') => {
  try {
    const result = await window.electron.ipcRenderer.invoke(
      'auth:changePassword',
      currentPassword,
      newPassword
    )
    console.log('Resultado de cambio de contraseña:', result)
    return result
  } catch (error) {
    console.error('Error cambiando contraseña:', error)
    return { error: error.message }
  }
}

const testUpdateProfile = async () => {
  try {
    const updates = {
      nombre: 'Usuario Actualizado',
      phoneNumber: '111222333'
    }
    const result = await window.electron.ipcRenderer.invoke('auth:updateProfile', updates)
    console.log('Resultado de actualización de perfil:', result)
    return result
  } catch (error) {
    console.error('Error actualizando perfil:', error)
    return { error: error.message }
  }
}

// Prueba completa de autenticación
const runAuthTest = async () => {
  console.log('=== Iniciando Prueba de Autenticación ===')

  try {
    // 1. Registrar usuario
    console.log('1. Registrando usuario...')
    await testRegister()

    // 2. Hacer login
    console.log('2. Haciendo login...')
    await testLogin()

    // 3. Verificar autenticación
    console.log('3. Verificando autenticación...')
    await testIsAuthenticated()

    // 4. Obtener usuario actual
    console.log('4. Obteniendo usuario actual...')
    await testGetCurrentUser()

    // 5. Actualizar perfil
    console.log('5. Actualizando perfil...')
    await testUpdateProfile()

    // 6. Cambiar contraseña
    console.log('6. Cambiando contraseña...')
    await testChangePassword()

    // 7. Hacer login con nueva contraseña
    console.log('7. Login con nueva contraseña...')
    await testLogin('auth@ejemplo.com', '654321')

    // 8. Hacer logout
    console.log('8. Haciendo logout...')
    await testLogout()

    // 9. Verificar que no está autenticado
    console.log('9. Verificando que no está autenticado...')
    await testIsAuthenticated()

    console.log('=== Prueba de Autenticación Completada ===')
  } catch (error) {
    console.error('La prueba de autenticación falló:', error)
  }
}

// ===== INSTRUCCIONES ACTUALIZADAS =====
console.log('')
console.log('=== FUNCIONES DE AUTENTICACIÓN DISPONIBLES ===')
console.log('- testRegister() - Registrar nuevo usuario')
console.log('- testLogin(email, password) - Hacer login')
console.log('- testGetCurrentUser() - Obtener usuario actual')
console.log('- testIsAuthenticated() - Verificar autenticación')
console.log('- testLogout() - Cerrar sesión')
console.log('- testChangePassword(current, new) - Cambiar contraseña')
console.log('- testUpdateProfile() - Actualizar perfil')
console.log('- runAuthTest() - Ejecutar todas las pruebas de autenticación')
console.log('')
console.log('=== EJEMPLO DE USO ===')
console.log('// Para probar autenticación completa:')
console.log('runAuthTest()')
console.log('')
console.log('// Para probar funciones individuales:')
console.log('await testRegister()')
console.log('await testLogin("auth@ejemplo.com", "123456")')
console.log('await testGetCurrentUser()')

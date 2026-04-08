/* ============================================
   AUTH - Registration, Login, Session, Manager
   ============================================ */

const Auth = {
    async init() {
        // Create manager if doesn't exist
        const users = Storage.getUsers();
        if (!users['manager']) {
            const hash = await UI.hashPassword('admin');
            users['manager'] = {
                email: 'manager',
                password: hash,
                rol: 'manager',
                perfil: {
                    nombre: 'Administrador',
                    genero: null,
                    edad: null,
                    altura: null,
                    peso: null,
                    areaPrincipal: null,
                    tipoUsuario: null,
                    ingresos: [],
                    deudas: [],
                    opcionesActivas: {
                        biblia: true, cicloMenstrual: false, gastosCompartidos: false,
                        juegos: true, habitos: true, ejercicios: true, estudios: true,
                        documentos: true, gratitud: true, salud: true, biografia: true, viajes: true
                    },
                    preferenciasModulos: []
                },
                configuracionCompleta: true,
                fechaCreacion: new Date().toISOString()
            };
            Storage.saveUsers(users);
        }
        // Initialize global modules config if not exists
        Storage.getModulesGlobal();
    },

    async register(email, password, perfil) {
        if (!email || !password) {
            return { success: false, error: 'Correo y contraseña son obligatorios' };
        }

        email = email.toLowerCase().trim();
        const users = Storage.getUsers();

        if (users[email]) {
            return { success: false, error: 'Este correo ya está registrado' };
        }

        const hash = await UI.hashPassword(password);

        const defaultOptions = {
            biblia: true, cicloMenstrual: false, gastosCompartidos: false,
            juegos: true, habitos: true, ejercicios: true, estudios: true,
            documentos: true, gratitud: true, salud: true, biografia: true, viajes: true
        };

        const userObj = {
            email,
            password: hash,
            rol: 'user',
            perfil: {
                nombre: perfil?.nombre || '',
                genero: perfil?.genero || null,
                edad: perfil?.edad || null,
                altura: perfil?.altura || null,
                peso: perfil?.peso || null,
                tipoCuerpo: perfil?.tipoCuerpo || null,
                areaPrincipal: perfil?.areaPrincipal || null,
                tipoUsuario: perfil?.tipoUsuario || null,
                objetivoPrincipal: perfil?.objetivoPrincipal || null,
                ingresos: perfil?.ingresos || [],
                deudas: perfil?.deudas || [],
                opcionesActivas: perfil?.opcionesActivas || defaultOptions,
                preferenciasModulos: []
            },
            configuracionCompleta: false,
            fechaCreacion: new Date().toISOString()
        };

        // Auto-enable cycle if gender is female
        if (perfil?.genero === 'mujer') {
            userObj.perfil.opcionesActivas.cicloMenstrual = true;
        }

        users[email] = userObj;
        Storage.saveUsers(users);

        // Initialize isolated user data
        Storage.saveUserData(email, Storage._defaultUserData());

        // Set session
        Storage.setSession(email);

        return { success: true, user: userObj };
    },

    async login(email, password) {
        if (!email || !password) {
            return { success: false, error: 'Ingresa correo y contraseña' };
        }

        email = email.toLowerCase().trim();
        const user = Storage.getUser(email);

        if (!user) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        const hash = await UI.hashPassword(password);
        if (user.password !== hash) {
            return { success: false, error: 'Contraseña incorrecta' };
        }

        Storage.setSession(email);
        return { success: true, user };
    },

    async logout() {
        Storage.clearSession();
        // En Tauri hay que guardar ya para que la sesión se borre antes del reload
        if (typeof TauriStorage !== 'undefined' && TauriStorage.isTauri() && TauriStorage.saveNow) {
            await TauriStorage.saveNow();
        }
        window.location.hash = '#login';
        window.location.reload();
    },

    getCurrentUser() {
        const session = Storage.getSession();
        if (!session || !session.email) return null;
        const user = Storage.getUser(session.email);
        if (!user) {
            Storage.clearSession();
            return null;
        }
        return user;
    },

    getCurrentEmail() {
        const session = Storage.getSession();
        return session ? session.email : null;
    },

    isManager() {
        const user = this.getCurrentUser();
        return user && user.rol === 'manager';
    },

    isManagerViewMode() {
        const session = Storage.getSession();
        return session && session.managerViewMode === true;
    },

    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    completeSetup(profileData) {
        const email = this.getCurrentEmail();
        if (!email) return false;

        const users = Storage.getUsers();
        const user = users[email];
        if (!user) return false;

        // Update profile fields
        if (profileData.nombre !== undefined) user.perfil.nombre = profileData.nombre;
        if (profileData.genero !== undefined) user.perfil.genero = profileData.genero;
        if (profileData.edad !== undefined) user.perfil.edad = profileData.edad;
        if (profileData.altura !== undefined) user.perfil.altura = profileData.altura;
        if (profileData.peso !== undefined) user.perfil.peso = profileData.peso;
        if (profileData.tipoCuerpo !== undefined) user.perfil.tipoCuerpo = profileData.tipoCuerpo;
        if (profileData.areaPrincipal !== undefined) user.perfil.areaPrincipal = profileData.areaPrincipal;
        if (profileData.tipoUsuario !== undefined) user.perfil.tipoUsuario = profileData.tipoUsuario;
        if (profileData.ingresos !== undefined) user.perfil.ingresos = profileData.ingresos;
        if (profileData.deudas !== undefined) user.perfil.deudas = profileData.deudas;
        if (profileData.opcionesActivas !== undefined) user.perfil.opcionesActivas = profileData.opcionesActivas;

        // Auto-enable cycle if female
        if (profileData.genero === 'mujer') {
            user.perfil.opcionesActivas.cicloMenstrual = true;
        }

        user.configuracionCompleta = true;
        users[email] = user;
        Storage.saveUsers(users);
        return true;
    },

    updateProfile(profileData) {
        const email = this.getCurrentEmail();
        if (!email) return false;

        const users = Storage.getUsers();
        const user = users[email];
        if (!user) return false;

        Object.assign(user.perfil, profileData);

        if (profileData.genero === 'mujer') {
            user.perfil.opcionesActivas.cicloMenstrual = true;
        } else if (profileData.genero && profileData.genero !== 'mujer') {
            user.perfil.opcionesActivas.cicloMenstrual = false;
        }

        users[email] = user;
        Storage.saveUsers(users);
        return true;
    },

    async changePassword(email, newPassword) {
        const users = Storage.getUsers();
        const user = users[email];
        if (!user) return false;
        user.password = await UI.hashPassword(newPassword);
        users[email] = user;
        Storage.saveUsers(users);
        return true;
    }
};

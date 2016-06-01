'use strict';

angular.module('starter.services', ['config'])
  .factory('apiServices', function($resource, ENV) {
    return {
      proyectos: $resource(ENV.apiEndpoint + '/api/proyecto/:id'),
      tiposEquipos: $resource(ENV.apiEndpoint + '/api/tipoequipo/:id', {}, {
        getCarga: {
          method: 'get',
          url: ENV.apiEndpoint + '/api/tipoequipo/getCarga',
          isArray: true
        }
      }),
      actividades: $resource(ENV.apiEndpoint + '/api/actividad/:id', {}, {
        pendientes: {
          method: 'post',
          url: ENV.apiEndpoint + '/api/actividad/pendientes/:id_proyecto',
          isArray: true
        },
        enviar_pendientes: {
          method: 'post',
          url: ENV.apiEndpoint + '/api/actividad/cargar',
        },
        getMotivoEnum: {
          method: 'post',
          url: ENV.apiEndpoint + '/api/actividad/motivo_enum',
          isArray: true
        },
        update: {
          method: 'put'
        }
      })
    };
  })
  .factory('User', function($resource, ENV) {
    return $resource(ENV.apiEndpoint + '/api/users/:id/:controller', {
      id: '@_id'
    }, {
      get: {
        method: 'GET',
        params: {
          id: 'me'
        }
      }
    });
  })
  .factory('Auth', function Auth($http, User, $localStorage, $q, ENV, $state) {
    var safeCb = function(cb) {
        return (angular.isFunction(cb)) ? cb : angular.noop;
      },
      currentUser = {};
    if ($localStorage.token) {
      currentUser = User.get();
    }
    return {
      login: function(user, callback) {
        return $http.post(ENV.apiEndpoint + '/auth/local', {
          email: user.email,
          password: user.password
        }).then(function(res) {
          $localStorage.token = res.data.token;
          currentUser = User.get();
          return currentUser.$promise;
        }).then(function(user) {
          safeCb(callback)(null, user);
          return user;
        }).catch(function(err) {
          this.logout();
          safeCb(callback)(err.data);
          return $q.reject(err.data);
        }.bind(this));
      },
      logout: function() {
        /*IMPORTANTE*/
        // todos los datos se pierden cuando se hace logout
        delete $localStorage.token; //token sesion
        delete $localStorage.proyectos;
        delete $localStorage.categorias;
        delete $localStorage.envios_pendientes; //envios pendientes
        delete $localStorage.nueva_actividad;
        delete $localStorage.actividad_pendiente;
        currentUser = {};
        $state.go('login');
      },
      getCurrentUser: function(callback) {
        if (arguments.length === 0) {
          return currentUser;
        }
        var value = (currentUser.hasOwnProperty('$promise')) ? currentUser.$promise : currentUser;
        return $q.when(value).then(function(user) {
          safeCb(callback)(user);
          return user;
        }, function() {
          safeCb(callback)({});
          return {};
        });
      },
      isLoggedIn: function(callback) {
        if (arguments.length === 0) {
          return currentUser.hasOwnProperty('role');
        }
        return this.getCurrentUser(null).then(function(user) {
          var is = user.hasOwnProperty('role');
          safeCb(callback)(is);
          return is;
        });
      },
      isAdmin: function(callback) {
        if (arguments.length === 0) {
          return currentUser.role === 'admin';
        }
        return this.getCurrentUser(null).then(function(user) {
          var is = user.role === 'admin';
          safeCb(callback)(is);
          return is;
        });
      },
      getToken: function() {
        return $localStorage.token;
      }
    };
  });

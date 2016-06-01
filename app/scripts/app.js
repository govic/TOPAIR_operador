'use strict';

// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', [
  'ionic',
  'starter.services',
  'starter.controllers',
  'ngResource',
  'ngStorage',
  'underscore',
  'ngCordova'
])

.run(function($ionicPlatform, $rootScope, $ionicLoading /*, apiServices, $localStorage, _, $cordovaNetwork, $ionicPopup*/ ) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });

  //evento para mostrar loading
  $rootScope.$on('loading:show', function() {
    $ionicLoading.show({ template: 'Cargando ...' });
  });

  //evento para esconder loading
  $rootScope.$on('loading:hide', function() {
    $ionicLoading.hide();
  });

  // $rootScope.$on('$cordovaNetwork:online', function( /*event, networkState*/ ) {
  //   /*carga();*/
  //   $ionicPopup.alert({
  //     title: 'Ops!',
  //     template: 'Conectado a la red!'
  //   });
  // });
  // $rootScope.$on('$cordovaNetwork:offline', function( /*event, networkState*/ ) {
  //   /*carga();*/
  //   $ionicPopup.alert({
  //     title: 'Ops!',
  //     template: 'Red no encontrada!'
  //   });
  // });
})

//metodos para carga de datos
.factory('cargaDatos', function($localStorage, Auth, apiServices, _, $state, $ionicPopup) {
  return {
    //metodo para cargar datos iniciales de la aplicacion
    cargar: function() {
      //carga proyectos
      $localStorage.proyectos = [];
      if (!$localStorage.envios_pendientes) { $localStorage.envios_pendientes = []; }

      //busca proyectos activos // si rol no es admin solo muestra proyectos asociados a usuario
      apiServices.proyectos.query(function(data) {
        if (data && data.length > 0) {
          $localStorage.proyectos = data;
          //carga pendientes
          _.each($localStorage.proyectos, function(proyecto) {
            apiServices.actividades.pendientes({ id_proyecto: proyecto._id }, function(data) {
              if (data && data.length > 0) {
                _.each(data, function(x) {
                  //metodo para buscar indice de repetido
                  x.actividad = x._id;
                  var indice = _.findIndex($localStorage.envios_pendientes, function(local) {
                    return local.actividad === x.actividad;
                  });
                  if (indice === -1) {
                    //si actividad no existe, la crea
                    $localStorage.envios_pendientes.unshift(x);
                  } else {
                    //si actividad existe, la reemplaza
                    $localStorage.envios_pendientes[indice] = x;
                  }
                });
              } else {
                proyecto.pendientes = [];
              }
            }, function(err) {
              console.error(err);
              proyecto.pendientes = [];
              $ionicPopup.alert({
                title: 'Error al cargar!',
                template: 'Error al cargar trabajos pendientes.'
              });
            });
          });

          $state.go('app.proyectos');
        }
      }, function(err) {
        console.error(err);
        $localStorage.proyectos = [];
        $ionicPopup.alert({
          title: 'Error al cargar!',
          template: 'Error al cargar proyectos asociados.'
        });
      });

      //carga motivos visita
      apiServices.actividades.getMotivoEnum(function(data) {
        $localStorage.motivos = data;
      }, function(err) {
        console.error(err);
        $localStorage.motivos = [];
        $ionicPopup.alert({
          title: 'Error al cargar!',
          template: 'Error al cargar lista motivos de visitas.'
        });
      });

      //carga tipos de equipos y trabajos asociados
      apiServices.tiposEquipos.getCarga(function(data) {
        $localStorage.tiposEquipos = data;
      }, function(err) {
        console.error(err);
        $localStorage.tiposEquipos = [];
        $ionicPopup.alert({
          title: 'Error al cargar!',
          template: 'Error al cargar tipos de equipos y trabajos asociados.'
        });
      });

    },
    //metodo para enviar una actividad al servidor
    enviar_single: function(actividadId, callback) {
      var index = _.findIndex($localStorage.envios_pendientes, function(x) {
        return x.actividad === actividadId;
      });
      if (index < 0) {
        $ionicPopup.alert({
          title: 'Error!',
          template: 'Trabajo no encontrado'
        }).then(function() {
          $state.go('app.proyectos');
          return;
        });
      } else {
        $localStorage.envios_pendientes[index].es_pendiente = false;
        if ($localStorage.envios_pendientes[index].es_nueva) {
          apiServices.actividades.save($localStorage.envios_pendientes[index], function() {
            var proyecto = $localStorage.envios_pendientes[index].proyecto;
            if (callback) { callback(); }
            $localStorage.envios_pendientes.splice(index, 1);
            $ionicPopup.alert({
              title: 'Exito!',
              template: 'Datos sincronizados'
            }).then(function() {
              $state.go('app.actividades', { proyectoId: proyecto });
              return;
            });
          }, function(err) {
            console.error(err);
            $ionicPopup.alert({
              title: 'Ops!',
              template: 'Error al sincronizar datos de trabajo'
            });
          });
        } else {
          apiServices.actividades.update({ id: actividadId }, $localStorage.envios_pendientes[index], function() {
            var proyecto = $localStorage.envios_pendientes[index].proyecto;
            if (callback) { callback(); }
            $localStorage.envios_pendientes.splice(index, 1);
            $ionicPopup.alert({
              title: 'Exito!',
              template: 'Datos sincronizados'
            }).then(function() {
              $state.go('app.actividades', { proyectoId: proyecto });
              return;
            });
          }, function(err) {
            console.error(err);
            $ionicPopup.alert({
              title: 'Ops!',
              template: 'Error al sincronizar datos de trabajo'
            });
          });
        }
      }
    }
  };
})

//interceptor para verificar usuario autorizado
.factory('authInterceptor', function($rootScope, $q, $localStorage, $injector) {
  var state;
  return {
    // Add authorization token to headers
    request: function(config) {
      config.headers = config.headers || {};
      config.headers['Access-Control-Allow-Origin'] = '*';
      if ($localStorage.token) {
        config.headers.Authorization = 'Bearer ' + $localStorage.token;
      }
      return config;
    },

    // Intercept 401s and redirect you to login
    responseError: function(response) {
      if (response.status === 401) {
        (state || (state = $injector.get('$state'))).go('login');
        // remove any stale tokens
        delete $localStorage.token;
        return $q.reject(response);
      } else {
        return $q.reject(response);
      }
    }
  };
})

//interceptor para mostrar loading cuando se ocupe la api
.factory('loadingInterceptor', function($rootScope, $q) {
  return {
    request: function(config) {
      $rootScope.$broadcast('loading:show');
      return config;
    },
    response: function(response) {
      $rootScope.$broadcast('loading:hide');
      return response;
    },
    responseError: function(response) {
      $rootScope.$broadcast('loading:hide');
      return $q.reject(response);
    }
  };
})

.config(function($stateProvider, $urlRouterProvider, $httpProvider) {

  //registra interceptores
  $httpProvider.interceptors.push('authInterceptor');
  $httpProvider.interceptors.push('loadingInterceptor');

  //configuracion de rutas
  $stateProvider.state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'AppCtrl'
  })

  //proyectos = salas
  .state('app.proyectos', {
    url: '/proyectos',
    views: {
      'menuContent': {
        templateUrl: 'templates/proyectos.html',
        controller: 'ProyectosCtrl'
      }
    }
  })

  //actividades = trabajos
  .state('app.actividades', {
    url: '/actividades/:proyectoId',
    views: {
      'menuContent': {
        templateUrl: 'templates/actividades.html',
        controller: 'ActividadesCtrl'
      }
    }
  })

  //etapas administracions actividades

  //etapa - datos
  .state('app.etapa_datos', {
    url: '/etapa_datos/:actividadId',
    views: {
      'menuContent': {
        templateUrl: 'templates/etapa_datos.html',
        controller: 'EtapaDatosCtrl'
      }
    }
  })

  //etapa - estado inicial
  .state('app.etapa_estado_inicial', {
    url: '/etapa_estado_inicial/:actividadId',
    views: {
      'menuContent': {
        templateUrl: 'templates/etapa_estado_inicial.html',
        controller: 'EtapaEstadoInicialCtrl'
      }
    }
  })

  //etapa - parametros
  .state('app.etapa_parametros', {
    url: '/etapa_parametros/:actividadId',
    views: {
      'menuContent': {
        templateUrl: 'templates/etapa_parametros.html',
        controller: 'EtapaParametrosCtrl'
      }
    }
  })

  //etapa - trabajos realizados
  .state('app.etapa_trabajos_realizados', {
    url: '/etapa_trabajos_realizados/:actividadId',
    views: {
      'menuContent': {
        templateUrl: 'templates/etapa_trabajos_realizados.html',
        controller: 'EtapaTrabajosRealizadosCtrl'
      }
    }
  })

  //etapa - recomendaciones
  .state('app.etapa_recomendaciones', {
    url: '/etapa_recomendaciones/:actividadId',
    views: {
      'menuContent': {
        templateUrl: 'templates/etapa_recomendaciones.html',
        controller: 'EtapaRecomendacionesCtrl'
      }
    }
  })

  //etapa - recomendaciones (3)
  .state('app.confirmar', {
    url: '/confirmar/:actividadId',
    views: {
      'menuContent': {
        templateUrl: 'templates/confirmar.html',
        controller: 'ConfirmarCtrl'
      }
    }
  })

  //login
  .state('login', {
    url: '/login',
    controller: 'LoginCtrl',
    templateUrl: 'templates/login.html',
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/login');
});

'use strict';

angular.module('starter.controllers', ['config']).controller('AppCtrl', function($scope, Auth, cargaDatos, $localStorage, $ionicPopup, $state, _) {
  //envia metodos de servicio a vista
  $scope.auth = Auth;

  //metodo para hacer carga manual de datos estaticos
  $scope.cargarDatos = function() {
    cargaDatos.cargar();
    $state.go('app.proyectos');
  };

  //metodo para eliminar actividades y registros guardados localmente
  $scope.limiparPendientes = function() {
    $ionicPopup.confirm({
      title: 'Advertencia!',
      template: '¿Está seguro de eliminar todos los trabajos no sincronizados?'
    }).then(function(res) {
      if (res) {
        $localStorage.envios_pendientes = _.filter($localStorage.envios_pendientes, function(x) {
          return !x.es_nueva;
        });
        $state.go('app.proyectos');
      }
    });
  };
})

//login
.controller('LoginCtrl', function($scope, Auth, $state, $ionicPopup) {

  //verifica si usuario tiene token de sesion
  if (Auth.getToken()) {
    $state.go('app.proyectos');
  }

  //modelo de datos
  $scope.model = {
    email: '',
    password: ''
  };

  //metodo para ingresar como usuario
  $scope.login = function() {
    Auth.login({
      email: $scope.model.email,
      password: $scope.model.password
    }).then(function() {
      $state.go('app.proyectos');
    }).catch(function(err) {
      if (!$scope.errors) { $scope.errors = {}; }
      if (err) { $scope.errors.other = err.message; }
      $ionicPopup.alert({
        title: 'Error!',
        template: $scope.errors.other || 'Ha ocurrido un error al iniciar sesión, intente nuevamente.'
      });
    });
  };

  //accion para cada ves que muestra vista de este controller
  $scope.$on('$ionicView.enter', function() {
    if (Auth.isLoggedIn()) {
      $state.go('app.proyectos');
    }
  });

})

//proyectos
.controller('ProyectosCtrl', function(apiServices, $scope, $ionicPopup, $localStorage /*, $cordovaNetwork*/ ) {

  //modelo vista
  $scope.model = {
    proyectos: []
  };

  //busca datos
  $scope.cargar = function() {
    $scope.$broadcast('scroll.refreshComplete');
    $scope.model.proyectos = $localStorage.proyectos || [];
  };
  $scope.cargar();

  //accion para cada ves que muestra vista de este controller
  $scope.$on('$ionicView.enter', function() {
    $scope.cargar();
  });

})

//actividades = trabajos
.controller('ActividadesCtrl', function($scope, $stateParams, apiServices, $localStorage, $state, $ionicPopup, _) {
  $scope.model = {
    proyecto: {
      _id: $stateParams.proyectoId
    },
    pendientes: []
  };

  //busca datos
  $scope.cargar = function() {
    $scope.$broadcast('scroll.refreshComplete');
    if ($localStorage.proyectos && $localStorage.proyectos.length > 0) {
      var proyecto = _.find($localStorage.proyectos, function(x) {
        return x._id === $scope.model.proyecto._id;
      });
      if (proyecto) {
        if ($localStorage.envios_pendientes && $localStorage.envios_pendientes.length > 0) {
          $scope.model.pendientes = _.filter($localStorage.envios_pendientes, function(x) {
            return x.proyecto === proyecto._id && x.es_pendiente;
          });
        } else {
          $scope.model.pendientes = [];
        }
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'El proyecto seleccionado no existe'
        });
      }
    } else {
      //sin proyectos para mostrar
      $state.go('app.proyectos');
    }
  };
  $scope.cargar();

  //accion para cada ves que muestra vista de este controller
  $scope.$on('$ionicView.enter', function() {
    $scope.cargar();
  });

  //metodo que agrega nueva actividad a lista de pendientes de envio
  $scope.nueva_actividad = function() {
    if (!$localStorage.envios_pendientes) { $localStorage.envios_pendientes = []; }
    var actividad_id = Date.now().toString();
    $localStorage.envios_pendientes.unshift({
      es_pendiente: true, //indica que actividad creada es pendiente
      es_nueva: true, //indicador para sincronizar con metodo save en lugar de update
      actividad: actividad_id, //agrega id local en actividad para poder distinguir
      proyecto: $stateParams.proyectoId,
      fecha_ingreso: Date.now()
    });
    $state.go('app.etapa_datos', { actividadId: actividad_id });
  };
})

//etapa datos
.controller('EtapaDatosCtrl', function($scope, $localStorage, $ionicPopup, _, $stateParams, $state, $cordovaBarcodeScanner, $ionicScrollDelegate) {

  //modelo vista
  $scope.model = {
    proyecto: '',
    motivos: [],
    motivo: '',
    equipos: [],
    equipo: '',
    ubicaciones: [],
    ubicacion: '',
    ver_ingreso_manual_equipo: false
  };

  //busca datos
  $scope.cargar = function() {
    $scope.$broadcast('scroll.refreshComplete');
    $ionicScrollDelegate.scrollTop();
    if ($localStorage.envios_pendientes && $localStorage.envios_pendientes.length > 0) {
      //busca actividad
      var actividad = _.find($localStorage.envios_pendientes, function(x) {
        return x.actividad === $stateParams.actividadId;
      });
      if (!actividad) {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Actividad no encontrada'
        }).then(function() {
          $state.go('app.proyectos');
          return;
        });
      }
      //busca proyecto
      $scope.model.proyecto = actividad.proyecto;
      var proyecto = _.find($localStorage.proyectos, function(x) {
        return x._id === actividad.proyecto;
      });
      if (!proyecto) {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Proyecto no encontrado'
        }).then(function() {
          $state.go('app.proyectos');
          return;
        });
      }

      if (actividad && proyecto) {
        $scope.model.motivos = $localStorage.motivos;
        $scope.model.motivo = actividad.motivo_visita;
        $scope.model.equipos = proyecto.equipos;
        if (actividad.equipo) {
          $scope.model.equipo = _.find($scope.model.equipos, function(x) {
            return x._id === actividad.equipo._id;
          });
        }
        $scope.model.ubicaciones = proyecto.ubicaciones;
        if (actividad.ubicacion) {
          $scope.model.ubicacion = _.find($scope.model.ubicaciones, function(x) {
            return x._id === actividad.ubicacion._id;
          });
        }
      }
    } else {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Sin actividades pendientes para mostrar'
      }).then(function() {
        $state.go('app.proyectos');
      });
    }
  };
  $scope.cargar();
  $scope.$on('$ionicView.enter', function() {
    $scope.cargar();
  });

  //metodo para leer qr de un equipo
  $scope.equipo_qr = function() {
    $cordovaBarcodeScanner.scan().then(function(data) {
      $scope.model.equipo = _.find($scope.model.equipos, function(x) {
        return x._id === data.text;
      });
      if (!$scope.model.equipo) {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'El equipo no esta asociado al contrato actual'
        });
      }
    }, function(err) {
      console.error(err);
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Identificador de equipo no reconocido'
      });
    });
  };

  //metodo para guardar datos y continuar
  $scope.siguiente = function() {
    //busca indice de actividad
    var index = _.findIndex($localStorage.envios_pendientes, function(x) {
      return x.actividad === $stateParams.actividadId;
    });
    if (index < 0) {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Actividad no encontrada'
      }).then(function() {
        $state.go('app.proyectos');
        return;
      });
    } else {
      if ($scope.model.motivo && $scope.model.equipo && $scope.model.ubicacion) {
        $localStorage.envios_pendientes[index].motivo_visita = $scope.model.motivo;
        $localStorage.envios_pendientes[index].equipo = $scope.model.equipo;
        $localStorage.envios_pendientes[index].ubicacion = $scope.model.ubicacion;
        //$state.go('app.etapa_parametros', { actividadId: $stateParams.actividadId });
        $state.go('app.etapa_estado_inicial', { actividadId: $stateParams.actividadId });
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Debe indica motivo de visita y equipo para continuar'
        });
      }
    }
  };
})

//etapa - estado inicial (1)
.controller('EtapaEstadoInicialCtrl', function($scope, $ionicPopup, $localStorage, $state, $stateParams, _, $cordovaCamera, OpcionesCamara, $ionicScrollDelegate) {
  $scope.model = {
    actividad: $stateParams.actividadId,
    estado_inicial: {
      texto: '',
      foto: '',
      foto2: '',
      foto3: '',
      fecha_ingreso: Date.now()
    }
  };

  //busca datos
  $scope.cargar = function() {
    $scope.$broadcast('scroll.refreshComplete');
    $ionicScrollDelegate.scrollTop();
    $scope.model.actividad = $stateParams.actividadId;
    if ($localStorage.envios_pendientes && $localStorage.envios_pendientes.length > 0) {
      var actividad = _.find($localStorage.envios_pendientes, function(x) {
        return x.actividad === $stateParams.actividadId;
      });
      if (actividad) {
        if (!actividad.estado_inicial) { actividad.estado_inicial = {}; }
        $scope.model.estado_inicial.texto = actividad.estado_inicial.texto;
        $scope.model.estado_inicial.foto = actividad.estado_inicial.foto;
        $scope.model.estado_inicial.fecha_ingreso = Date.now();
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Actividad no encontrada'
        }).then(function() {
          $state.go('app.proyectos');
          return;
        });
      }
    } else {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Sin actividades pendientes para mostrar'
      }).then(function() {
        $state.go('app.proyectos');
      });
    }
  };
  $scope.cargar();
  $scope.$on('$ionicView.enter', function() {
    $scope.cargar();
  });

  //metodo para capturar foto
  $scope.tomar_foto = function(indice) {
    $cordovaCamera.getPicture(OpcionesCamara).then(function(data) {
      switch(indice) {
        case 1: $scope.model.estado_inicial.foto = data; break;
        case 2: $scope.model.estado_inicial.foto2 = data; break;
        case 3: $scope.model.estado_inicial.foto3 = data; break;
      }
    }, function(err) {
      console.error(err);
      $scope.model.estado_inicial.foto = '';
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Se ha cancelado la captura de foto'
      });
    });
  };

  //metodo para guardar datos y continuar
  $scope.siguiente = function() {
    //busca indice de actividad
    var index = _.findIndex($localStorage.envios_pendientes, function(x) {
      return x.actividad === $stateParams.actividadId;
    });
    if (index < 0) {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Actividad no encontrada'
      }).then(function() {
        $state.go('app.proyectos');
        return;
      });
    } else {
      if ($scope.model.estado_inicial.texto) {
        $localStorage.envios_pendientes[index].estado_inicial.fecha_ingreso = Date.now();
        $localStorage.envios_pendientes[index].estado_inicial.texto = $scope.model.estado_inicial.texto;
        if ($scope.model.estado_inicial.foto) { $localStorage.envios_pendientes[index].estado_inicial.foto = $scope.model.estado_inicial.foto; }
        //$state.go('app.etapa_trabajos_realizados', { actividadId: $stateParams.actividadId });
        $state.go('app.etapa_parametros', { actividadId: $stateParams.actividadId });
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Debe ingresar la descripción'
        });
      }
    }
  };
})

//etapa - parametros
.controller('EtapaParametrosCtrl', function($scope, $ionicPopup, $state, $localStorage, _, $stateParams, $ionicScrollDelegate) {
  //modelo vista
  $scope.model = {
    actividad: $stateParams.actividadId,
    parametros: {
      compresor_n1_r: '',
      compresor_n1_s: '',
      compresor_n1_t: '',
      compresor_n2_r: '',
      compresor_n2_s: '',
      compresor_n2_t: '',
      p_succion: '',
      p_descarga: '',
      t_inyeccion: '',
      t_retorno: '',
      t_ambiente: '',
      t_exterior: '',
      fecha_ingreso: Date.now()
    }
  };

  //busca datos
  $scope.cargar = function() {
    $scope.$broadcast('scroll.refreshComplete');
    $ionicScrollDelegate.scrollTop();
    $scope.model.actividad = $stateParams.actividadId;
    if ($localStorage.envios_pendientes && $localStorage.envios_pendientes.length > 0) {
      var actividad = _.find($localStorage.envios_pendientes, function(x) {
        return x.actividad === $stateParams.actividadId;
      });
      if (actividad) {
        if (!actividad.parametros) { actividad.parametros = {}; }
        $scope.model.parametros.compresor_n1_r = actividad.parametros.compresor_n1_r;
        $scope.model.parametros.compresor_n1_s = actividad.parametros.compresor_n1_s;
        $scope.model.parametros.compresor_n1_t = actividad.parametros.compresor_n1_t;
        $scope.model.parametros.compresor_n2_r = actividad.parametros.compresor_n2_r;
        $scope.model.parametros.compresor_n2_s = actividad.parametros.compresor_n2_s;
        $scope.model.parametros.compresor_n2_t = actividad.parametros.compresor_n2_t;
        $scope.model.parametros.p_succion = actividad.parametros.p_succion;
        $scope.model.parametros.p_descarga = actividad.parametros.p_descarga;
        $scope.model.parametros.t_inyeccion = actividad.parametros.t_inyeccion;
        $scope.model.parametros.t_retorno = actividad.parametros.t_retorno;
        $scope.model.parametros.t_ambiente = actividad.parametros.t_ambiente;
        $scope.model.parametros.t_exterior = actividad.parametros.t_exterior;
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Actividad no encontrada'
        }).then(function() {
          $state.go('app.proyectos');
          return;
        });
      }
    } else {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Sin actividades pendientes para mostrar'
      }).then(function() {
        $state.go('app.proyectos');
      });
    }
  };
  $scope.cargar();
  $scope.$on('$ionicView.enter', function() {
    $scope.cargar();
  });

  //metodo para guardar datos y continuar
  $scope.siguiente = function() {
    //busca indice de actividad
    var index = _.findIndex($localStorage.envios_pendientes, function(x) {
      return x.actividad === $stateParams.actividadId;
    });
    if (index < 0) {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Actividad no encontrada'
      }).then(function() {
        $state.go('app.proyectos');
        return;
      });
    } else {
      if (isNaN($scope.model.parametros.compresor_n1_r) ||
        isNaN($scope.model.parametros.compresor_n1_s) ||
        isNaN($scope.model.parametros.compresor_n1_t) ||
        isNaN($scope.model.parametros.compresor_n2_r) ||
        isNaN($scope.model.parametros.compresor_n2_s) ||
        isNaN($scope.model.parametros.compresor_n2_t) ||
        isNaN($scope.model.parametros.p_succion) ||
        isNaN($scope.model.parametros.p_descarga) ||
        isNaN($scope.model.parametros.t_inyeccion) ||
        isNaN($scope.model.parametros.t_retorno) ||
        isNaN($scope.model.parametros.t_ambiente) ||
        isNaN($scope.model.parametros.t_exterior)
      ) {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Debe ingresar todos los parámetros del equipo'
        });
      } else {
        $localStorage.envios_pendientes[index].parametros.fecha_ingreso = Date.now();
        $localStorage.envios_pendientes[index].parametros = $scope.model.parametros;
        //$state.go('app.etapa_estado_inicial', { actividadId: $stateParams.actividadId });
        $state.go('app.etapa_trabajos_realizados', { actividadId: $stateParams.actividadId });
      }
    }
  };
})

//etapa - trabajos realizados (2)
.controller('EtapaTrabajosRealizadosCtrl', function($scope, $ionicPopup, $localStorage, $state, $stateParams, _, $cordovaCamera, OpcionesCamara, $ionicScrollDelegate) {
  $scope.model = {
    actividad: $stateParams.actividadId,
    trabajos_realizados: {
      texto: '',
      foto: '',
      fecha_ingreso: Date.now(),
      trabajos: []
    },
    trabajos: []
  };

  //busca datos
  $scope.cargar = function() {
    $scope.$broadcast('scroll.refreshComplete');
    $ionicScrollDelegate.scrollTop();
    $scope.model.actividad = $stateParams.actividadId;
    if ($localStorage.envios_pendientes && $localStorage.envios_pendientes.length > 0) {
      var actividad = _.find($localStorage.envios_pendientes, function(x) {
        return x.actividad === $stateParams.actividadId;
      });
      if (actividad) {
        if (!actividad.trabajos_realizados) { actividad.trabajos_realizados = {}; }
        $scope.model.trabajos_realizados.texto = actividad.trabajos_realizados.texto;
        $scope.model.trabajos_realizados.foto = actividad.trabajos_realizados.foto;
        $scope.model.trabajos_realizados.fecha_ingreso = Date.now();
        if (actividad.equipo && actividad.equipo.tipo && $localStorage.tiposEquipos) {
          var tipo = _.find($localStorage.tiposEquipos, function(x) {
            return x._id === actividad.equipo.tipo;
          });
          if (tipo && tipo.trabajos) {
            $scope.model.trabajos = tipo.trabajos;
            if (actividad.trabajos_realizados && actividad.trabajos_realizados.trabajos && actividad.trabajos_realizados.trabajos.length > 0) {
              _.each($scope.model.trabajos, function(x) {
                x.checked = actividad.trabajos_realizados.trabajos.includes(x._id);
              });
            }
          } else {
            $scope.model.trabajos = [];
          }
        } else {
          $scope.model.trabajos = [];
        }
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Actividad no encontrada'
        }).then(function() {
          $state.go('app.proyectos');
          return;
        });
      }
    } else {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Sin actividades pendientes para mostrar'
      }).then(function() {
        $state.go('app.proyectos');
      });
    }
  };
  $scope.cargar();
  $scope.$on('$ionicView.enter', function() {
    $scope.cargar();
  });

  //metodo para capturar foto
  $scope.tomar_foto = function() {
    $cordovaCamera.getPicture(OpcionesCamara).then(function(data) {
      $scope.model.trabajos_realizados.foto = data;
    }, function(err) {
      console.error(err);
      $scope.model.trabajos_realizados.foto = '';
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Se ha cancelado la captura de foto'
      });
    });
  };

  //metodo para guardar datos y continuar
  $scope.siguiente = function() {
    //busca indice de actividad
    var index = _.findIndex($localStorage.envios_pendientes, function(x) {
      return x.actividad === $stateParams.actividadId;
    });
    if (index < 0) {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Actividad no encontrada'
      }).then(function() {
        $state.go('app.proyectos');
        return;
      });
    } else {
      if ($scope.model.trabajos_realizados.texto) {
        $localStorage.envios_pendientes[index].trabajos_realizados.fecha_ingreso = Date.now();
        $localStorage.envios_pendientes[index].trabajos_realizados.texto = $scope.model.trabajos_realizados.texto;
        if ($scope.model.trabajos_realizados.foto) { $localStorage.envios_pendientes[index].trabajos_realizados.foto = $scope.model.trabajos_realizados.foto; }
        if ($scope.model.trabajos && $scope.model.trabajos.length > 0) {
          $localStorage.envios_pendientes[index].trabajos_realizados.trabajos = _.map(_.filter($scope.model.trabajos, function(x) {
            return x.checked;
          }), function(x) {
            return x._id;
          });
        } else {
          $localStorage.envios_pendientes[index].trabajos_realizados.trabajos = [];
        }
        $state.go('app.etapa_recomendaciones', { actividadId: $stateParams.actividadId });
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Debe ingresar la descripción'
        });
      }
    }
  };
})

//etapa - recomendaciones (3)
.controller('EtapaRecomendacionesCtrl', function($scope, $ionicPopup, $localStorage, $state, $stateParams, _, $ionicScrollDelegate) {
  $scope.model = {
    actividad: $stateParams.actividadId,
    recomendaciones: {
      texto: '',
      fecha_ingreso: Date.now()
    }
  };

  //busca datos
  $scope.cargar = function() {
    $scope.$broadcast('scroll.refreshComplete');
    $ionicScrollDelegate.scrollTop();
    $scope.model.actividad = $stateParams.actividadId;
    if ($localStorage.envios_pendientes && $localStorage.envios_pendientes.length > 0) {
      var actividad = _.find($localStorage.envios_pendientes, function(x) {
        return x.actividad === $stateParams.actividadId;
      });
      if (actividad) {
        if (!actividad.recomendaciones) { actividad.recomendaciones = {}; }
        $scope.model.recomendaciones.texto = actividad.recomendaciones.texto;
        $scope.model.recomendaciones.fecha_ingreso = Date.now();
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Actividad no encontrada'
        }).then(function() {
          $state.go('app.proyectos');
          return;
        });
      }
    } else {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Sin actividades pendientes para mostrar'
      }).then(function() {
        $state.go('app.proyectos');
      });
    }
  };
  $scope.cargar();
  $scope.$on('$ionicView.enter', function() {
    $scope.cargar();
  });

  //metodo para guardar datos y continuar
  $scope.siguiente = function() {
    //busca indice de actividad
    var index = _.findIndex($localStorage.envios_pendientes, function(x) {
      return x.actividad === $stateParams.actividadId;
    });
    if (index < 0) {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Actividad no encontrada'
      }).then(function() {
        $state.go('app.proyectos');
        return;
      });
    } else {
      if ($scope.model.recomendaciones.texto) {
        $localStorage.envios_pendientes[index].recomendaciones.fecha_ingreso = Date.now();
        $localStorage.envios_pendientes[index].recomendaciones.texto = $scope.model.recomendaciones.texto;
        $state.go('app.confirmar', { actividadId: $stateParams.actividadId });
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Debe ingresar la descripción'
        });
      }
    }
  };
})

//pantalla de confirmacion
.controller('ConfirmarCtrl', function($state, $stateParams, $scope, $localStorage, _, $ionicPopup, cargaDatos, $ionicScrollDelegate) {
  //modelo vista
  $scope.model = {
    //para esta vista la var actividad es el objeto completo
    actividad: {},
    mensajes: {
      generales: [],
      etapa_datos: [],
      etapa_parametros: [],
      etapa_estado_inicial: [],
      etapa_trabajos_realizados: [],
      etapa_recomendaciones: []
    }
  };

  //busca datos
  $scope.cargar = function() {
    $scope.$broadcast('scroll.refreshComplete');
    $ionicScrollDelegate.scrollTop();
    if ($localStorage.envios_pendientes && $localStorage.envios_pendientes.length > 0) {
      var actividad = _.find($localStorage.envios_pendientes, function(x) {
        return x.actividad === $stateParams.actividadId;
      });
      if (actividad) {
        $scope.model.actividad = actividad;
        $scope.verificar();
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Actividad no encontrada'
        }).then(function() {
          $state.go('app.proyectos');
          return;
        });
      }
    } else {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Sin trabajos pendientes para mostrar'
      }).then(function() {
        $state.go('app.proyectos');
      });
    }
  };

  //metodo para saber si existen mensajes
  $scope.existen_mensajes = function() {
    return $scope.model &&
      $scope.model.mensajes &&
      (($scope.model.mensajes.generales && $scope.model.mensajes.generales.length > 0) ||
        ($scope.model.mensajes.etapa_datos && $scope.model.mensajes.etapa_datos.length > 0) ||
        ($scope.model.mensajes.etapa_parametros && $scope.model.mensajes.etapa_parametros.length > 0) ||
        ($scope.model.mensajes.etapa_estado_inicial && $scope.model.mensajes.etapa_estado_inicial.length > 0) ||
        ($scope.model.mensajes.etapa_trabajos_realizados && $scope.model.mensajes.etapa_trabajos_realizados.length > 0) ||
        ($scope.model.mensajes.etapa_recomendaciones && $scope.model.mensajes.etapa_recomendaciones.length > 0));
  };

  //metodo para verificar datos actividad
  $scope.verificar = function() {
    $scope.model.mensajes = {
      generales: [],
      etapa_datos: [],
      etapa_parametros: [],
      etapa_estado_inicial: [],
      etapa_trabajos_realizados: [],
      etapa_recomendaciones: []
    };
    //verifica actividad
    if (!$scope.model.actividad) { $scope.model.mensajes.generales.push('Trabajo no existe'); }
    if ($scope.model.actividad) {
      //verifica actividad
      if (!$scope.model.actividad.actividad) { $scope.model.mensajes.generales.push('Id de trabajo no asignado'); }
      if (!$scope.model.actividad.proyecto) { $scope.model.mensajes.generales.push('Trabajo no asiciado a ningún contrato'); }
      //verifica etapa datos
      if (!$scope.model.actividad.motivo_visita) { $scope.model.mensajes.etapa_datos.push('Motivo de visita no ingresado'); }
      if (!$scope.model.actividad.equipo) { $scope.model.mensajes.etapa_datos.push('Equipo no asigando'); }
      //verifica etapa parametros
      if ($scope.model.actividad.parametros) {
        if (isNaN($scope.model.actividad.parametros.compresor_n1_r)) { $scope.model.mensajes.etapa_parametros.push('Parámetro R en C. Compresor N1 no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.compresor_n1_s)) { $scope.model.mensajes.etapa_parametros.push('Parámetro S en C. Compresor N1 no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.compresor_n1_t)) { $scope.model.mensajes.etapa_parametros.push('Parámetro T en C. Compresor N1 no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.compresor_n2_r)) { $scope.model.mensajes.etapa_parametros.push('Parámetro R en C. Compresor N2 no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.compresor_n2_s)) { $scope.model.mensajes.etapa_parametros.push('Parámetro S en C. Compresor N2 no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.compresor_n2_t)) { $scope.model.mensajes.etapa_parametros.push('Parámetro T en C. Compresor N2 no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.p_succion)) { $scope.model.mensajes.etapa_parametros.push('Parámetro P. Succion no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.p_descarga)) { $scope.model.mensajes.etapa_parametros.push('Parámetro P. Descarga no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.t_inyeccion)) { $scope.model.mensajes.etapa_parametros.push('Parámetro T. Inyeccion no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.t_retorno)) { $scope.model.mensajes.etapa_parametros.push('Parámetro T. Retorno no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.t_ambiente)) { $scope.model.mensajes.etapa_parametros.push('Parámetro T. Ambiente no ingresado'); }
        if (isNaN($scope.model.actividad.parametros.t_exterior)) { $scope.model.mensajes.etapa_parametros.push('Parámetro T. Exterior no ingresado'); }
      } else {
        $scope.model.mensajes.etapa_parametros.push('Datos de parámetros no ingresados');
      }
      //verifica etapa estado inicial
      if ($scope.model.actividad.estado_inicial) {
        if (!$scope.model.actividad.estado_inicial.texto) { $scope.model.mensajes.etapa_estado_inicial.push('Estado inicial equipo no ingresado'); }
      } else {
        $scope.model.mensajes.etapa_estado_inicial.push('Datos estado inicial equipo no ingresados');
      }
      //verifica etapa trabajos realizados
      if ($scope.model.actividad.trabajos_realizados) {
        if (!$scope.model.actividad.trabajos_realizados.texto) { $scope.model.mensajes.etapa_trabajos_realizados.push('Trabajos realizados no ingresados'); }
      } else {
        $scope.model.mensajes.etapa_trabajos_realizados.push('Datos de trabajos realizados no ingresados');
      }
      //verifica etapa recomendaciones
      if ($scope.model.actividad.recomendaciones) {
        if (!$scope.model.actividad.recomendaciones.texto) { $scope.model.mensajes.etapa_recomendaciones.push('Recomendaciones no ingresadas'); }
      } else {
        $scope.model.mensajes.etapa_recomendaciones.push('Datos de recomendaciones no ingresados');
      }
    }
  };

  //cargas
  $scope.cargar();
  $scope.$on('$ionicView.enter', function() {
    $scope.cargar();
  });

  //metodo para confirmar y enviar datos actividad al servidor
  $scope.confirmar = function() {
    if ($scope.model.actividad) {
      $ionicPopup.confirm({
        title: 'Importante!',
        template: '¿Sincronizar datos de trabajo con el servidor?',
        cancelText: 'Cancelar',
        okText: 'Enviar',
        okType: 'button-balanced'
      }).then(function(res) {
        if (res) {
          cargaDatos.enviar_single($stateParams.actividadId);
        }
      });
    } else {
      $ionicPopup.alert({
        title: 'Ops!',
        template: 'Trabajo no encontrado'
      }).then(function() {
        $state.go('app.proyectos');
        return;
      });
    }
  };

  //metodo para ir circuito de etapas y completar datos
  $scope.revisar = function() {
    $state.go('app.etapa_datos', { actividadId: $stateParams.actividadId });
  };

  //metodo para eliminar actividad en local
  $scope.descartar = function() {
    $ionicPopup.confirm({
      title: 'Advertencia!',
      template: 'Se dispone a eliminar permanentemente el trabajo de su dispositivo, ¿está seguro de realizar esta acción?',
      cancelText: 'Cancelar',
      okText: 'Eliminar',
      okType: 'button-assertive'
    }).then(function(res) {
      if (res && $localStorage.envios_pendientes && $localStorage.envios_pendientes.length > 0) {
        var index = _.findIndex($localStorage.envios_pendientes, function(x) {
          return x.actividad === $stateParams.actividadId;
        });
        if (index < 0) {
          $ionicPopup.alert({
            title: 'Ops!',
            template: 'Trabajo no encontrado'
          }).then(function() {
            $state.go('app.proyectos');
            return;
          });
        } else {
          $localStorage.envios_pendientes.splice(index, 1);
          $ionicPopup.alert({
            title: 'Exito!',
            template: 'El trabajo ha sido eliminado'
          }).then(function() {
            $state.go('app.proyectos');
            return;
          });
        }
      } else {
        $ionicPopup.alert({
          title: 'Ops!',
          template: 'Trabajo no encontrado'
        }).then(function() {
          $state.go('app.proyectos');
          return;
        });
      }
    });
  };
});

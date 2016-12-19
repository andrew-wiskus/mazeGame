myApp.controller("GameBoardController", ["$scope", "$http", "$window", "$document", "$timeout", "$location", "$firebaseAuth", "UserFactory",
    function($scope, $http, $window, $document, $timeout, $location, $firebaseAuth, UserFactory) {

        var auth = $firebaseAuth();
        $scope.user = {};
        auth.$onAuthStateChanged(function(user){
          $scope.user = user;
          if(user == null){
            UserFactory.signIn()();
          }

          var userMazes = firebase.database()
          .ref()
          .child(user.uid)

          userMazes.on('value', snap=>{
            var userMaps = makeSnapshotObject(snap.val());
            userMaps = userMaps.map(customMap =>{
              var tempMap = makeSnapshotObject(customMap)
              return {name: tempMap.pop(), maze: tempMap} ;
            })

            $timeout(function(){
              $scope.user.maps = userMaps;
              //console.log('yes?')
              //console.log($scope.user.maps)
            },0)
          })




        })
        //MARK: -- Maze Building
        $scope.mazeBuildingInProgress = false;
        $scope.currentMaze = '';
        var updatedTiles = [];
        $scope.currentTile = '';

        $scope.loadMaze = function(maze){
          //console.log('loading')
          $scope.currentMaze = maze.name;
          worldMap = makeTileGrid(1000, $scope.cameraZoom, maze.name);
          $scope.user.maps.forEach(function(map){
            if(map.name == maze){
              map.maze.forEach(tile=>{
                //console.log('worldmap', worldMap[tile.x][tile.y])
                //console.log('tileupdate', tile);
              worldMap[tile.x][tile.y] = tile;
            });

            }
          });
          $scope.cameraPosition = {
              x: 500,
              y: 500
          };
          $scope.camera = findCurrentView($scope.cameraPosition);


          $scope.mazeBuildingInProgress = false;
        }
        $scope.selectedTile = function(tile){
          $scope.currentTile = tile;
        }
        $scope.mazeName = '';
        $scope.createNewMaze = function(mazeName){
          $scope.currentMaze = mazeName
          worldMap = makeTileGrid(1000, $scope.cameraZoom, mazeName)
          $scope.cameraPosition = {
              x: 500,
              y: 500
          };
          $scope.camera = findCurrentView($scope.cameraPosition);

          $scope.mazeBuildingInProgress = true;
          updatedTiles = [];

          //make new firebase ref to mazeName, if mazeName exists .alert();



        }

        $scope.clickedTile = function(tile, index){
          //console.log(tile, index);
          $scope.camera[index].texture = $scope.currentTile;
          if($scope.currentTile == 'water.png'){
            $scope.camera[index].collider = true
            updateMazeDB($scope.currentMaze, $scope.camera[index])

          }
          if($scope.currentTile == 'grass.png'){
            $scope.camera[index].collider = false;
            updateMazeDB($scope.currentMaze, $scope.camera[index])
          }



        }

        function updateMazeDB(mazeName, tile){
          var dbRef = firebase.database()
          .ref()
          .child($scope.user.uid)
          .child(mazeName)
          .child(`x${tile.x}y${tile.y}`)
          .set(tile);


        }






        //MARK: -- GAME WINDOW RESOLUTION RESIZEING
        $scope.gameBoardSize = {};
        $scope.isHorizontal;
        function resizeGame() {
            var gameArea = document.getElementById('gameArea');
            var uiAreaLeft = document.getElementById('uiArea_Left');

            var widthToHeight = 5 / 5;

            var newWidth = window.innerWidth;
            var newHeight = window.innerHeight;

            var newWidthToHeight = newWidth / newHeight;

            if (newWidthToHeight > widthToHeight) {
                // window width is too wide relative to desired game width
                newWidth = newHeight * widthToHeight;
                gameArea.style.height = newHeight + 'px';
                gameArea.style.width = newWidth + 'px';
                $timeout(function(){
                  $scope.isHorizontal = true;
                }, 0)
            } else { // window height is too high relative to desired game height
                newHeight = newWidth / widthToHeight;
                gameArea.style.width = newWidth + 'px';
                gameArea.style.height = newHeight + 'px';

                $timeout(function(){
                  $scope.isHorizontal = false;
                }, 0)
            }

            gameArea.style.marginTop = (-newHeight / 2) + 'px';
            gameArea.style.marginLeft = (-newWidth / 2) + 'px';

            //gameArea.style.fontSize = (newWidth / 400) + 'em';

            var gameCanvas = document.getElementById('gameCanvas');
            gameCanvas.width = newWidth;
            gameCanvas.height = newHeight;

            $timeout(function() {
                $scope.gameBoardSize = {
                    width: newWidth,
                    height: newHeight
                };
                worldMap = worldMap.map(function(row) {
                    return row.map(function(tile) {
                        tile.width = newWidth / $scope.cameraZoom;
                        tile.height = newHeight / $scope.cameraZoom;
                        return tile;
                    })
                })
                $scope.divPositions = getDivPositions();



                $scope.camera = findCurrentView($scope.cameraPosition);

            }, 0)




        }

        $window.addEventListener('resize', resizeGame, false);
        $window.addEventListener('orientationchange', resizeGame, false);


        //MARK: -- CAMERA (current tiles in view)
        $scope.cameraZoom = 25;
        $scope.divPositions = [];

        function findCurrentView(position) {
            var x = position.x;
            var y = position.y;


            var view = worldMap.slice(y - ($scope.cameraZoom / 2), y + ($scope.cameraZoom / 2));
            view = view.map(row => {
                return row.slice(x - ($scope.cameraZoom / 2), x + ($scope.cameraZoom / 2));
            });

            var camera = [];
            view.forEach(row => {
                camera.push(...row);
            })

            return camera;
        }



        //MARK: MAP BUILDING FUNCTIONS
        function getTexture(x, y, mapName) {
            // ////console.log(x,y);

            if(mapName == 'o58j6ckq'){
              var random = Math.random(3)

              if (random > 0.3) {
                  return 'grass.png'
              }
              return 'water.png'
            }
            else {
              return 'water.png'
            }

        }

        function checkCollider(texture) {
            switch (texture) {
                case 'water.png':
                    return true;
                    break;
                default:
                    return false;
            }
        }

        function makeTileGrid(mapSize, zoom, mapName) {

            var gameMap = [];
            var row = [];
            var cols = mapSize;
            var rows = mapSize;
            var texture = '';

            //assuming width is > height;
            var tileSize = ($scope.gameBoardSize.width / $scope.cameraZoom)
            var width = tileSize;
            var height = tileSize;




            for (var x = 0; x < cols; x++) {
                row = [];
                for (var y = 0; y < rows; y++) {


                    var items = [];
                    texture = getTexture(x, y, mapName)
                    row.push({
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        texture: texture,
                        items: items,
                        collider: checkCollider(texture)
                    });
                }
                gameMap.push(row);
            }

            return gameMap;
        }

        function getDivPositions() {

            var divPositions = [];
            var zoom = $scope.cameraZoom;
            var divCount = zoom * zoom;
            var tilePercentSize = 100 / zoom;

            var xCount = 0;
            var yCount = 0;
            for (var y = 0; y < zoom; y++) {
                for (var x = 0; x < zoom; x++) {
                    xCount += tilePercentSize;
                    divPositions.push({
                        xPos: x * tilePercentSize,
                        yPos: y * tilePercentSize
                    })
                }
            }


            // divPositions.push({xPos: i, yPos: i});

            return divPositions;
        }



        //MARK: -- LAYER 3 :: Sprite Positioning
        $scope.userPosition = {
            x: 500,
            y: 500
        }

        var getSpritePosition = function(x, y) {

            let tile = _.find($scope.camera, function(tile) {
                return tile.x == x && tile.y == y;
            });
            let index = _.indexOf($scope.camera, tile);
            ////console.log(getDivPositions()[index])
            return getDivPositions()[index];

        }

        $scope.getSpritePosition = function(x, y) {
            return getSpritePosition(x, y);
        }




        $document.bind("keydown", function(event) {
            ////console.log(event.key);

            switch (event.key) {
                case "w":
                    moveCameraUp();
                    break;
                case "s":
                    moveCameraDown();
                    break;
                case "a":
                    moveCameraLeft();
                    break;
                case "d":
                    moveCameraRight();
                    break;

                case "e":
                    $scope.$apply(function() {
                        showTileEditor();
                    })

                    break;

                case "Tab":
                    event.preventDefault();
                    $scope.$apply(function() {
                        $scope.showUserSettings = !$scope.showUserSettings;

                    })
                    break;

                case "ArrowUp":
                    event.preventDefault();
                    if (worldMap[$scope.userPosition.x - 1][$scope.userPosition.y].collider != true) {

                        $timeout(function() {
                            if (getSpritePosition($scope.userPosition.x, $scope.userPosition.y).yPos <= 8) {
                                moveCameraUp();
                            }

                            $scope.userPosition.x--
                        }, 0)
                    }
                    break;

                case "ArrowDown":
                    event.preventDefault();
                    if (worldMap[$scope.userPosition.x + 1][$scope.userPosition.y].collider != true) {

                        $timeout(function() {
                            if (getSpritePosition($scope.userPosition.x, $scope.userPosition.y).yPos >= 88) {
                                moveCameraDown();
                            }
                            $scope.userPosition.x++
                        }, 0)
                    }
                    break;
                case "ArrowLeft":
                    event.preventDefault();
                    if (worldMap[$scope.userPosition.x][$scope.userPosition.y - 1].collider != true) {

                        $timeout(function() {
                            if (getSpritePosition($scope.userPosition.x, $scope.userPosition.y).xPos <= 8) {
                                moveCameraLeft();
                            }
                            $scope.userPosition.y--
                        }, 0)
                    }
                    break;
                case "ArrowRight":
                    event.preventDefault();
                    if (worldMap[$scope.userPosition.x][$scope.userPosition.y + 1].collider != true) {

                        $timeout(function() {
                            if (getSpritePosition($scope.userPosition.x, $scope.userPosition.y).xPos >= 88) {
                                moveCameraRight();
                            }
                            $scope.userPosition.y++
                        }, 0)
                    }
                    break;

            }

        });

        function moveCameraDown() {
            if ($scope.cameraPosition.y != 989) {
                $scope.cameraPosition.y += 1;
                ////console.log($scope.cameraPosition);
                $scope.$apply(function() {
                    $scope.camera = findCurrentView($scope.cameraPosition)
                })
            }
        }

        function moveCameraUp() {
            if ($scope.cameraPosition.y != 11) {
                $scope.cameraPosition.y -= 1;
                ////console.log($scope.cameraPosition);
                $scope.$apply(function() {
                    $scope.camera = findCurrentView($scope.cameraPosition)
                })
            }
        }

        function moveCameraLeft() {
            if ($scope.cameraPosition.x != 20) {
                $scope.cameraPosition.x -= 1;
                ////console.log($scope.cameraPosition);
                $scope.$apply(function() {
                    $scope.camera = findCurrentView($scope.cameraPosition)
                })
            }
        }

        function moveCameraRight() {
            if ($scope.cameraPosition.x != 980) {
                $scope.cameraPosition.x += 1;
                ////console.log($scope.cameraPosition);
                $scope.$apply(function() {
                    $scope.camera = findCurrentView($scope.cameraPosition)
                })
            }
        }

        //MARK: -- INIT
        resizeGame();
        var worldMap = makeTileGrid(1000, $scope.cameraZoom, 'o58j6ckq');

        $scope.cameraPosition = {
            x: 500,
            y: 500
        };
        $scope.camera = findCurrentView($scope.cameraPosition);

        function makeSnapshotObject(data) {
     var tempArray = [];
     _.pairs(data) //uses underscorejs to format object and update $scope.user.taskList
         .forEach(function(dataArray) {
             dataArray[1].key = dataArray[0];
             tempArray.push(
                 dataArray[1]
             )
         })

     return tempArray;
 }

    }
]);


// $scope.zoomOut = function(){
//   $scope.cameraZoom = $scope.cameraZoom + 5;
//   if ($scope.cameraZoom > 75){
//     $scope.cameraZoom = 75;
//   }
//   resizeGame();
// }
// $scope.zoomIn = function(){
//   $scope.cameraZoom = $scope.cameraZoom - 5;
//   if ($scope.cameraZoom < 10){
//     $scope.cameraZoom = 10;
//   }
//   resizeGame();
// }
//
// function makeWaterSeed() {
//     //wip
//     var waterSeed = [Math.floor((Math.random() * 300) + 1), Math.floor((Math.random() * 300) + 1)];
//     var waterWidth = Math.floor((Math.random() * 100) + 1)
//     var waterHeight = Math.floor((Math.random() * 100) + 1)
//     return null;
// }

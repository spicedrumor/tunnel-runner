( function () {

const Ta = trun_anim;
const Msg = trun_message;

const MESSAGE_QUEUE_MAX = 8;
const KEY_CODE_W = 87;
const KEY_CODE_A = 65;
const KEY_CODE_S = 83;
const KEY_CODE_D = 68;
const KEY_CODE_E = 69;
const MAP_VAL_EMPTY = 0;
const MAP_VAL_PLAYER = 1;
const MAP_VAL_MOB = 3;
const COLOR_PINK = "#FF66FF";
const MAX_PLOUGH = 5;
const SEVENER_SCORE_VALUE = 15;
const SPELL_COST = 32;
const RANDOM_MOB_INTERVAL = 1000;
const PROX_MOB_INTERVAL = 1000;
const TIMER_PAINT = 100;
const SMILESTARTSIZE = 128;
const SMILEHITCOUNT = 16;
const DEFAULT_LIFE = 128;
const DIRECTIONS = ["n", "s", "e", "w"];

let map;
let mapString;
let life;
let messageQueue;
let hitSound;
let timer, timerBit;
let mobList;
let currentKeys, smileCurSize;
let timerHeart, timerExist, timerMoveMob, timerDraw, timerMushroom;
let timerInteractions, timerPlayerFlash, timerPlayerPhasing;
let timerMovePlayer, timerProximal;
let smileReduction = SMILESTARTSIZE / SMILEHITCOUNT;
let difficulty = "normal";
let mapObject = { map: map, mobs: [] };
let playerObject = initPlayerObj();
let players = { player1: playerObject };
let currentRoundCount = 0;
let projectiles = [];

function initPlayerObj() {
  return trun_player.init();
}

function validTile(tileX, tileY) {
  var result, withinBounds;
  let [mW, mH] = [mapObject.width, mapObject.height];
  let notTooSmall = tileX >= 0 && tileY >= 0;
  let notTooBig   = tileX < mW && tileY < mH;
  result = withinBounds = notTooBig && notTooSmall;

  return result;
}

function clearTile(tileX, tileY) {
  return ( validTile(tileX, tileY) && emptyTile(tileX, tileY) );
}

function smashableTile(tileX, tileY) {
  var result, target;
  target = map[tileY][tileX];
  result = target === 12 || target === 0;

  return result;
}

function emptyTile(tileX, tileY) {
  return map[tileY][tileX] === 0;
}

function safeTile(tileX, tileY) {
  var result, value;
  value = map[tileY][tileX];
  result = (value != 1 && value != 2);

  return result;
}

function validSmash(newX, newY) {
  var result = false;
  if ( validTile(newX, newY) )
    if ( smashableTile(newX, newY) )
      result = true;

  return result;
}

function validMove(newX, newY) {
  return validTile(newX, newY) && emptyTile(newX, newY);
}

function clobberTile(tileX, tileY) {
  mapObject.removeMob(tileX, tileY);
}

function moveRandomMob() {
  var randomDirection, mover, random;
  if (mapObject.mobs.length > 0) {
    randomDirection = DIRECTIONS[ rng(4) ];
    random = Math.floor( Math.random() * mapObject.mobs.length );
    mover = mapObject.mobs[random];
    mobMove(randomDirection, mover.x, mover.y, mover.value);
  }
  timerMoveMob = setTimeout(moveRandomMob, RANDOM_MOB_INTERVAL);
}

function randomMobMove(originX, originY, value) {
  var result;
  let randomDirection = DIRECTIONS[ rng(4) ];
  result = mobMove(randomDirection, originX, originY, value);

  return result;
}

function mobMove(direction, originX, originY, value) {
  var result;
  if (value > 100) {
    result = clingyMobMove(originX, originY, value);
    if ( rng(3) ) {
      result = clingyMobMove( result[0], result[1], value );
    } else {
      result = move( direction, result[0], result[1], value );
    }
  } else {
    result = move(direction, originX, originY, value);
  }

  return result;
}

function projectileManager() {
  if (projectiles.length > 0) {
    let pState;
    let done = false;
    while (projectiles.length > 0 && !done) {
      pState = projectiles[0].alive;
      pState ? done = true : projectiles.shift();
    }
    for (let i = 0; i < projectiles.length; i++)
      Ta.moveProjectile( projectiles[i] );
  }
}

function proximalActivate(x, y) {
  let value = map[y][x];
  let newPosition;
  if (value === 3) {
    newPosition = randomMobMove(x, y, 3);
    if ( !rng(3) ) {
      [x, y] = [ newPosition[0], newPosition[1] ];
      randomMobMove(x, y, 3);
    }
  } else if (value === 4) {
    randomMobMove(x, y, 4);
  } else if (value === 5) {
    randomMobMove(x, y, 5);
  } else if (value === 6) {
    randomMobMove(x, y, 6);
  } else if (value === 7) {
    sevenActivate(x, y);
  } else if (value === 103) {
    randomMobMove(x, y, 103);
  }
}

function sevenActivate(x, y) {
  let [px, py] = [playerObject.xPos, playerObject.yPos];
  let goodX = Math.abs(px - x) < 4;
  let goodY = Math.abs(py - y) < 4;
  randomMobMove(x, y, 7);
  if (goodX && goodY) {
    let projOrigin = buildCoordObject(x, y);
    let projTarget = buildCoordObject(px, py);
    projectiles.push( Ta.newInboundProjectile(projTarget, projOrigin) );
    newMessage("Something burn-y lands on you!");
    playerHit(5);
  }
}

function buildCoordObject(xValue, yValue) {
  return { x: xValue, y: yValue };
}

function proximalActivations() {
  let originX = playerObject.xPos;
  let originY = playerObject.yPos;
  let proximalDepth = Math.pow(2, 3);
  let min = proximalDepth * (-1);
  let max = proximalDepth;
  let relativeX, relativeY, isValid, chance;
  for (let i = min; i <= max; i++)
    for (let j = min; j <= max; j++) {
      relativeX = originX + j;
      relativeY = originY + i;
      isValid = validTile(relativeX, relativeY);
      chance = rng(3) === 0;
      if (isValid && chance)
        proximalActivate(relativeX, relativeY);
    }
  timerProximal = setTimeout(proximalActivations, PROX_MOB_INTERVAL);
}

function ploughThrough(originX, originY, offsetX, offsetY, value, count, slain) {
  if ( count > 0 && validTile(originX + offsetX, originY + offsetY) ) {
    trun_sound.magic();
    let newX = originX + offsetX;
    let newY = originY + offsetY;
    playerObject.xPos = newX;
    playerObject.yPos = newY;
    map[originY][originX] = 0;
    if ( map[newY][newX] === 7 ) {
      slain += 1;
      sevenDown(slain);
      life += 16;
    } else if ( map[newY][newX] === 2 ) {
      winGame();
    }
    clobberTile(newX, newY);
    map[newY][newX] = value;
    ploughThrough(newX, newY, offsetX, offsetY, value, count - 1, slain);
  } else if (count === MAX_PLOUGH) {
    newMessage("That would be a very bad idea... ");
  } else {
    newMessage("You suddenly feel drained.");
    playerObject.powerMove = false;
  }
}

function powerMove(direction, originX, originY, value) {
  var offsetValues;
  var offsetX, offsetY;
  var newX, newY;
  offsetValues = getOffset(direction);
  offsetX = offsetValues[0];
  offsetY = offsetValues[1];
  newX = originX + offsetX;
  newY = originY + offsetY;
  ploughThrough(originX, originY, offsetX, offsetY, value, MAX_PLOUGH, 0);
}

function getOffset(direction) {
  var result;
  let offsetX = { n:  0, e: 1, s: 0, w: -1 }[direction];
  let offsetY = { n: -1, e: 0, s: 1, w:  0 }[direction];
  result = [offsetX, offsetY];

  return result;
}

function clingyMobMove(originX, originY, value) {
  var result;
  let offsetValues, offsetX, offsetY, newX, newY;
  let random;
  offsetX = offsetY = 0;
  result = [originX, originY];
  if (playerObject.xPos > originX) offsetX =  1;
  if (playerObject.xPos < originX) offsetX = -1;
  if (playerObject.yPos > originY) offsetY =  1;
  if (playerObject.yPos < originY) offsetY = -1;
  newX = originX + offsetX;
  newY = originY + offsetY;
  if ( validSmash(newX, newY) ) {
    result = [newX, newY];
    mapObject.removeMob(originX, originY);
    mapObject.insertMob(newX, newY, value);
  }

  return result;
}

function move(direction, originX, originY, value) {
  var result;
  var offsetValues, offsetX, offsetY;
  var newX, newY, target;
  result = [originX, originY];
  offsetValues = getOffset(direction);
  offsetX = offsetValues[0];
  offsetY = offsetValues[1];
  newX = originX + offsetX;
  newY = originY + offsetY;
  if ( validMove(newX, newY) ) {
    if (value != 1) {
      mapObject.removeMob(originX, originY);
      mapObject.insertMob(newX, newY, value);
      result = [newX, newY];
    } else {
      playerObject.xPos = newX;
      playerObject.yPos = newY;
      map[originY][originX] = 0;
      map[newY][newX] = value;
      result = [newX, newY];
    }
  } else if ( validTile(newX, newY) && value === 1 ) {
    target = map[newY][newX];
    playerBump(target, newX, newY, offsetX, offsetY);
  }

  return result;
}

function randomTile() {
  var result, randomX, randomY;
  randomX = Math.floor( Math.random() * map[0].length );
  randomY = Math.floor( Math.random() * map.length );
  result = [randomX, randomY];

  return result;
}

function spell() {
  var hit;
  var tileX, tileY;
  var target;
  var slain;
  var random;
  var xPos, yPos;
  xPos = playerObject.xPos;
  yPos = playerObject.yPos;
  life -= SPELL_COST;
  if (playerObject.blueBit) {
    newMessage("Your entire body tenses.");
    playerObject.powerMove = true;
  } else if (playerObject.pinkBit) {
    hit = false;
    for (let i = -1; i < 2; i++)
      for (let j = -1; j < 2; j++) {
        tileX = xPos + j;
        tileY = yPos + i;
        if ( validTile(tileX, tileY) ) {
          target = map[tileY][tileX];
          if ( validTile(tileX, tileY) && target > 1 && target < 10 )
            hit = true;
        }
      }
    if (hit) {
        newMessage("You feel too crowded for that.");
    } else {
      newMessage("You call upon that which you hold most dear... ");
      if ( clearTile(xPos - 1, yPos - 1) )
        map[yPos - 1][xPos - 1] = 14;
      if ( clearTile(xPos + 1, yPos - 1) )
        map[yPos - 1][xPos + 1] = 14;
      if ( clearTile(xPos - 1, yPos + 1) )
        map[yPos + 1][xPos - 1] = 14;
      if ( clearTile(xPos + 1, yPos + 1) )
        map[yPos + 1][xPos + 1] = 14;
    }
  } else if (playerObject.greenBit) {
    trun_sound.magic();
    newMessage("You focus on your chi... ");
    hit = false;
    slain = 0;
    for (let i = -1; i < 2; i++)
      for (let j = -1; j < 2; j++) {
        tileX = xPos + j;
        tileY = yPos + i;
        target = map[tileY][tileX];
        if ( validTile(tileX, tileY) && target > 2 ) {
          hit = true;
          target = map[tileY][tileX];
          clobberTile(tileX, tileY);
          if (target === 7) {
            slain += 1;
            map[tileY][tileX] = 18;
            sevenDown(slain);
          } else {
            map[tileY][tileX] = 0;
          }
        }
      }
    if (!hit) newMessage("Nothing happened...");
  }
}

function sevenDown(count) {
  if (count > 4) count = 4;
  let message = {
    1 : "A 7 has fallen!",
    2 : "Multi-Kill!",
    3 : "Mega-Kill!",
    4 : "M-M-M-MONSTER KILL!!!"
  }[count];
  newMessage(message);
  playerObject.score += SEVENER_SCORE_VALUE * ( Math.pow(2, count - 1) );
}

function playerMover() {
  var xPos, yPos;
  var moveTime = 200;
  xPos = playerObject.xPos;
  yPos = playerObject.yPos;
  if (playerObject.blueBit) moveTime = 80;
  if (currentKeys.length > 0)
    move( currentKeys[currentKeys.length - 1], xPos, yPos, MAP_VAL_PLAYER );
  timerMovePlayer = setTimeout(playerMover, moveTime);
}

document.onkeydown = function(e) {
  var direction;
  var newCoords;
  var key = e.keyCode ? e.keyCode : e.which;
  var xPos, yPos;
  xPos = playerObject.xPos;
  yPos = playerObject.yPos;
  direction = "";
  if (key === KEY_CODE_W) {
    direction = "n";
  } else if (key === KEY_CODE_D) {
    direction = "e";
  } else if (key === KEY_CODE_S) {
    direction = "s";
  } else if (key === KEY_CODE_A) {
    direction = "w";
  }
  if (direction !== "")
    if ( currentKeys.indexOf(direction) === -1 )
      if (playerObject.powerMove) {
        powerMove(direction, xPos, yPos, MAP_VAL_PLAYER);
      } else {
        move(direction, xPos, yPos, MAP_VAL_PLAYER);
        currentKeys.push(direction);
        clearTimeout(timerMovePlayer);
        timerMovePlayer = setTimeout(playerMover, 500);
      }
}

document.onkeyup = function(e) {
  var direction, value;
  var key = e.keyCode ? e.keyCode : e.which;
  direction = "";
  if (key === KEY_CODE_W) {
    direction = "n";
  } else if (key === KEY_CODE_D) {
    direction = "e";
  } else if (key === KEY_CODE_S) {
    direction = "s";
  } else if (key === KEY_CODE_A) {
    direction = "w";
  } else if (key === KEY_CODE_E) {
    if (playerObject.hasPick) {
      if (playerObject.wielded === "nothing") {
        newMessage("You wield your pick.");
        playerObject.wielded = "pick";
      } else {
        newMessage("You stop wielding your pick.");
        playerObject.wielded = "nothing";
      }
    } else {
      newMessage("You have nothing to equip.");
    }
  } else if (key === 72) {
    tmiss_help.menu();
  } else if (key === 73) {
    newMessage("You check your inventory...");
    if (playerObject.hasShield) {
      newMessage("You are carrying a banged-up metal shield.");
    } else {
      newMessage("Your inventory is empty.");
    }
  } else if (key === 80) {
    life -= 5;
    quickUpdate();
    alert("You exchange some life energy to suspend time.");
  } else if (key === 81) {
    if (life > SPELL_COST) {
      spell();
    } else {
      newMessage("You feel too weak for that.");
    }
  }
  if (direction !== "") {
    value = currentKeys.indexOf(direction);
    currentKeys.splice(value, 1);
    if (currentKeys.length === 0) clearTimeout(timerMovePlayer);
  }
}

function playerInteractions() {
  var rc, current, tileX, tileY;
  for (let i = -1; i < 2; i++)
    for (let j = -1; j < 2; j++) {
      tileX = playerObject.xPos + j;
      tileY = playerObject.yPos + i;
      if ( validTile(tileX, tileY) ) {
        current = map[tileY][tileX];
        if (current != 0)
          rc = playerInteract(current, tileX, tileY);
      }
      if (rc === -1) return;
    }
  timerInteractions = setTimeout(playerInteractions, 500);
}

function playerInteract(value, valueX, valueY) {
  var damage, newX, newY;
  var result, message, done, timeOut;
  let player = playerObject;
  result = 0;
  if (value === -1) {
    newMessage("The flames lick at you!");
    playerHit(1);
  } else if (value === 2) {
    winGame();
    result = -1;
  } else if (value === 3) {
    if ( player.isBlue() && rng(2) ) {
      newMessage("You narrowly evade 3's attack!");
    } else {
      if ( player.hasShield && !rng(4) ) {
        block("You manage to block 3's attack!");
      } else {
        newMessage("3 bites you with glee!");
        playerHit(1);
      }
      if ( life > 0 && player.isGreen() )
        if ( !rng(2) ) {
          player.score += 10;
          newMessage("You grab the 3 and hurl it into the distance!");
          clobberTile(valueX, valueY);
        } else {
          newMessage("You reach for the 3 but it deftly scampers away.");
        }
    }
  } else if (value === 4) {
    shimmering(valueX, valueY);
  } else if (value === 5) {
    if ( player.isBlue() && rng(2) ) {
      newMessage("You narrowly evade 5's shards!");
    } else {
      if (player.hasShield) {
        block("Your shield absorbs some of 5's shrapnel!");
        damage = ( rng(21) + 5 ) - (4 * player.shieldCount);
      } else {
        newMessage("5 shatters in your general direction!");
        damage = rng(21) + 5;
      }
      playerHit(damage);
    }
    mapObject.removeMob(valueX, valueY);
  } else if (value === 6) {
    funeral(valueX, valueY);
  } else if (value === 7) {
    if ( player.isBlue() && !rng(3) ) {
      newMessage("7 hisses as you just barely dodge its attack!");
    } else if ( phaseBuff() ) {
    } else {
      if (player.hasShield) {
        block("Your shield partially blocks 7s attack!");
        damage = ( rng(52) + 49 ) - (8 * player.shieldCount);
        playerHit(damage);
      } else {
        newMessage("7 touches base with you.");
        gameOver("7 8 u  :(");
        result = -1;
      }
    }
  } else if (value === 8) {
    message = "8 grins mischievously.";
    throttledMessage(message);
  } else if (value === 9) {
    message = "9 lays a blessing of protection.";
    context.drawImage(pic, 0, 0, SMILESTARTSIZE, SMILESTARTSIZE);
    smileCurSize = SMILESTARTSIZE;
    throttledMessage(message);
    player.armour = 16;
  } else if (value === 10) {
    eat(valueX, valueY, 8, "You devour a curious looking mushroom.");
    if ( player.isGreen() ) life += 4;
    player.score += 4;
  } else if (value === 11) {
    eat(valueX, valueY, 16, "Sweet, sweet candy.");
    player.score += 4;
  } else if (value === 16 || value === 17) {
    teleport(player, value);
  } else if (value === 18) {
    eat(valueX, valueY, 16, "You snatch up the crystal and swallow it whole!");
    player.score += 4;
  } else if (value === 19) {
    recover(valueX, valueY, player, 150);
    if (!player.hasShield) {
      newMessage("You find an old, tarnished metal shield.");
      newMessage("You hold the shield defensively.");
    } else {
      newMessage("You manage to upgrade your shield with scavenged parts.");
    }
    player.addShield();
  } else if (value === 20) {
    recover(valueX, valueY, player, 150);
    if (!player.hasPick) {
      newMessage("You find an old, tarnished metal pick.");
      newMessage("Type \"E\" to equip or unequip it.");
    } else {
      newMessage("You manage to upgrade your pick with scavenged parts.");
    }
    player.addPick();
  } else if (value === 103) {
    if ( player.isBlue() && !rng(3) ) {
      newMessage("You just barely evade 3's attack!");
    } else {
      if ( player.hasShield && !rng(6) ) {
        block("You manage to block 3's attack!");
      } else {
        newMessage("3's fangs tear off a chunk of your flesh!");
        playerHit( rng(9) + 3 );
      }
      if ( life > 0 && player.isGreen() ) {
        if ( !rng(3) ) {
          player.score += 100;
          newMessage("You grab the 3 and hurl it into the distance!");
          clobberTile(valueX, valueY);
        } else {
          newMessage("3 chomps on your hand as you reach for it!");
        }
      }
    }
  } else if (value === 300) {
    eat(valueX, valueY, 4, Msg.eat.blueMush);
    player.isBlue() ? life += 2 : blueify();
  } else if (value === 301) {
    eat(valueX, valueY, 4, Msg.eat.pinkMush);
    player.isPink() ? life += 2 : pinkify();
  } else if (value === 302) {
    eat(valueX, valueY, 4, Msg.eat.greenMush);
    player.isGreen() ? life += 2 : greenify();
  }
  if (life < 1) result = -1;

  return result;
}

function shimmering(x, y) {
  newMessage("4 begins to shimmer...");
  for (let i = j = 0; i < 4; i++) {
    var tile = randomTile();
    if ( emptyTile( tile[0], tile[1] ) ) {
      mapObject.insertMob( tile[0], tile[1], 4 );
      j += 1;
    }
  }
  if (!j) newMessage("4 failed to propagate!");
  if ( !rng(3) ) {
    newMessage("4 metamorphosizes!");
    mapObject.removeMob(x, y);
    mapObject.insertMob(x, y, 8);
  } else {
    clobberTile(x, y);
  }
}

function funeral(x, y) {
  newMessage("6 whistles a funeral dirge and evaporates.");
  let tile;
  for (let i = 0; i < 6; i++) {
    tile = randomTile();
    if ( emptyTile( tile[0], tile[1] ) )
      mapObject.insertMob( tile[0], tile[1], 7 );
  }
  mapObject.removeMob(x, y);
}

function teleport(player, type) {
  yShift = ( rng(16) + 32 );
  newMessage("You are drawn into the event horizon.");
  if (type === 16) {
    yLimit = mapObject.height - 1;
    newY = player.yPos + yShift;
    if (newY > yLimit) newY = yLimit;
  } else {
    newY = player.yPos - yShift;
    if (newY < 0) newY = 0;
  }
  playerTeleport(player.xPos, newY);
  trun_sound.magic();
}

function blueify() {
  newMessage("You feel much lighter!");
  colourPlayer("b");
}
function pinkify() {
  newMessage("You feel much angrier!");
  colourPlayer("p");
}
function greenify() {
  newMessage("You feel like you live in a world made of cardboard!");
  colourPlayer("g");
}

function eat(x, y, amount, message) {
  trun_sound.eat();
  newMessage(message);
  console.log("x: %s y: %s", x, y)
  console.log("map[y]: %s", map[y])
  console.log("map[y][x]: %s", map[y][x])
  map[y][x] = 0;
  life += amount;
}

function recover(x, y, player, score) {
  map[y][x] = 0;
  player.score += score;
}

function block(message) {
  let player = playerObject;
  player.blockRecently = 15;
  newMessage(message);
}

function rng(value) {
  return Math.floor( Math.random() * value );
}

function throttledMessage(message) {
  let matchesPrev     = messageQueue[0] === message;
  let matchesPrevPrev = messageQueue[1] === message;
  recentMessage = matchesPrev || matchesPrevPrev;
  if (!recentMessage) newMessage(message);
}

function playerTeleport(newX, newY) {
  map[playerObject.yPos][playerObject.xPos] = 0;
  playerObject.xPos = newX;
  playerObject.yPos = newY;
  if ( map[newY][newX] != 0 )
    newMessage("Something explodes into many wet chunks.");
  map[newY][newX] = 1;
  playerPhase();
}

function mineTile(xPos, yPos) {
  newMessage("The wall blows apart from your onslaught!");
  map[yPos][xPos] = 0;
  let pickStrength = playerObject.pickCount;
  if ( !rng(pickStrength * 32) ) {
    newMessage("Your pick breaks into pieces!");
    playerObject.wielded = "nothing";
    playerObject.hasPick = false;
    playerObject.pickCount = 0;
  }
}

function playerBump(value, valueX, valueY, offsetX, offsetY) {
  var random;
  var timeOut;
  var pick, pickCount;
  var wallTile;
  blue = playerObject.isBlue();
  pink = playerObject.isPink();
  green = playerObject.isGreen();
  pick = (playerObject.wielded === "pick");
  wallTile = (value === 12);
  if ( wallTile && (!green || pick) ) {
    if (!pick) {
      throttledMessage("You huff and you puff but the wall remains.");
    } else {
      mineTile(valueX, valueY);
    }
  } else if (value === 14 && pink) {
    newMessage("You light the fuse...");
    map[valueY][valueX] = 15;
    timeOut = setTimeout( function() {
      tmiss_mapMutate.explosion(valueX, valueY, mapObject, playerObject, validTile, newMessage, true)
    }, 5000 );
    if (mapObject.boomAlert[valueY] === undefined)
      mapObject.boomAlert[valueY] = [];
    mapObject.boomAlert[valueY][valueX] = timeOut;
  } else if (value === 15 && pink) {
    newMessage("You execute your best flying dropkick!");
    bootItem(valueX, valueY, offsetX, offsetY, 3);
  } else if ( (wallTile || value === 14) && green ) {
    if ( map[valueY + offsetY][valueX + offsetX] === 0 ) {
      newMessage("You put your back into it!");
      map[valueY + offsetY][valueX + offsetX] = map[valueY][valueX];
      map[valueY][valueX] = 0;
    }
  }
}

function bootItem(tileX, tileY, offsetX, offsetY, travel) {
  var value,  array;
  let newX = tileX + offsetX;
  let newY = tileY + offsetY;
  if ( map[newY][newX] === 0 ) {
    value = map[tileY][tileX];
    map[tileY][tileX] = 0;
    map[newY][newX] = value;
    if (value === 15) {
      array = mapObject.boomAlert;
      clearTimeout( array[tileY][tileX] );
      if ( array[newY] === undefined ) array[newY] = [];
      array[newY][newX] = setTimeout( function() {
        tmiss_mapMutate.explosion(newX, newY, mapObject, playerObject, validTile, newMessage, true)
      }, 5000 );
    }
    if (travel > 0)
      bootItem(newX, newY, offsetX, offsetY, travel - 1);
  }
}

function phaseBuff() {
  var result = false;
  if (playerObject.phasing) {
    newMessage("Your phase-state protects you from attack!");
    result = true;
  }

  return result;
}

function canvasPaint() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  tmiss_draw.paintCanvas(mapObject, playerObject, context);
  if (playerObject.armour > 0) {
    while (playerObject.armourReduction > 0) {
      smileCurSize = smileCurSize - smileReduction;
      playerObject.armourReduction -= 1;
    }
    context.drawImage(pic, 0, 0, smileCurSize, smileCurSize);
  }
  if (playerObject.blockRecently > 0) {
    playerObject.blockRecently -= 1;
    context.drawImage( block_pic, ( canvas.width / 2 - 75 ), ( canvas.height / 2 - 70 ), SMILESTARTSIZE - 10, SMILESTARTSIZE - 10 );
  }
  if (playerObject.hitRecently > 0) {
    playerObject.hitRecently -= 1;
    context.drawImage( scratch_pic, ( canvas.width / 2 - 19 ), ( canvas.height / 2 - 15 ), 64, 64 );
  }
  if (projectiles.length > 0) {
    projectileManager();
    let projX = null;
    let projY = null;
    for (let i = 0; i < projectiles.length; i++) {
      projX = projectiles[i].currX;
      projY = projectiles[i].currY;
      context.drawImage( slimy_pic, projX, projY + ( 8 - rng(16) ), 16, 16 );
    }
  }
  canvasPrint();
  timerPaint = setTimeout(canvasPaint, TIMER_PAINT);
}

function canvasPrint() {
  var string;
  var textCanvas = document.getElementById('canvas2');
  var textCanvasWidth = textCanvas.width;
  var textCanvasHeight = textCanvas.height;
  var ctx = textCanvas.getContext('2d');
  var textAlign;
  var playerPosition;
  textAlign = 10;
  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  ctx.font = "bold 20px Courier";
  ctx.fillStyle = "white";
  string = "Life: ";
  ctx.fillText(string, textAlign, 30);
  string = "";
  ctx.fillStyle = "red";
  string += "[";
  for (let i = life; i > 0; i -= 10)
    string += "+";
  string += "]";
  ctx.fillText(string, textAlign + 60, 30);
  playerPosition = Math.floor(playerObject.yPos / mapObject.height * 100);
  ctx.fillStyle = "yellow";
  string = playerPosition;
  string += "%";
  ctx.fillText(string, textAlign + 435, 30);
  for (let i = 0; i < MESSAGE_QUEUE_MAX; i++)
    if (i === 0) {
      ctx.font = "bold 20px Courier";
      ctx.fillStyle = "lime";
      ctx.fillText(messageQueue[i], textAlign, 60 + i * 20);
    } else {
      ctx.font = "bold 16px Courier";
      ctx.fillStyle = "grey";
      ctx.fillText(messageQueue[i], textAlign, 60 + i * 20);
    }
}

function armourBuff() {
  var result = false;
  if (playerObject.armour > 0) {
    newMessage("Your hardened exterior absorbs the attack!");
    result = true;
    playerObject.armour -= 1;
    playerObject.armourReduction += 1;
    if (playerObject.armour === 0) {
      newMessage("Your hardiness wears off.");
      playerObject.armourReduction = 0;
    }
  }

  return result;
}

function playerPhase() {
  clearTimeout(timerPlayerPhasing);
  timerPlayerPhasing = setTimeout( function() {
    playerPhasing()
  }, 2000 );
  playerObject.phasing = true;
  flashOn(2000);
}

function playerPhasing() {
  playerObject.phasing = false;
  newMessage("You fully phase into existence.");
}

function playerHit(damage) {
  if ( !armourBuff() && !phaseBuff() )
    if (damage > 0) {
      life -= damage;
      flashOn(200);
    } else {
      newMessage("You take no damage.");
    }
  if (playerObject.hitRecently < 1)
    playerObject.hitRecently = 3;
}

function flashOn(millisecs) {
  clearTimeout(timerPlayerFlash);
  timerPlayerFlash = setTimeout( function() { playerFlash(10) }, millisecs );
  playerObject.flashBit = true;
}

function playerFlash(counter) {
  if (counter > 0) {
    playerObject.flashBit = counter % 2 !== 0;
    timerPlayerFlash = setTimeout( function() { playerFlash(counter - 1) }, 200 );
  } else if (counter === 0) {
    playerObject.flashBit = false;
  }
}

function randomMush() {
  let millisecs, random;
  millisecs = ( Math.floor( Math.random() * 11 ) + 25 ) * 1000;
  random = randomTile();
  if ( emptyTile( random[0], random[1] ) )
    map[ random[1] ][ random[0] ] = 10;
  timerMushroom = setTimeout(randomMush, millisecs);
}


function winGame() {
  quickUpdate();
  score = playerObject.score
  score += (timer * 10);
  score += life;
  if (difficulty === "easy") score = score / 2;
  if (difficulty === "hard") score = score * 3;
  score = Math.floor(score);
  let adjustedScore = score;
  let grades = ["E", "D", "C", "C+", "B", "B+", "A", "A+"];
  if (adjustedScore > 700) adjustedScore = 700;
  if (adjustedScore < 0)   adjustedScore = 0;
  let grade = grades[ Math.floor(adjustedScore / 100) ];
  trun_sound.win();
  endGame();
  setTimeout( function() {
    window.alert("Good job!\nDifficulty: " + difficulty + "\nTotal score: " + score + "\nFinal grade: " + grade);
  setTimeout(startGame, 500);
  }, 500);
}

function gameOverAlert(message) {
  let string = "Game Over: " + message;
  string += "\n" + "Difficulty: " + difficulty;
  window.alert(string);
  setTimeout(startGame, 500);
}

function quickUpdate() {
  clearTimeout(timerPaint);
  canvasPaint();
}

function gameOver(message) {
  quickUpdate();
  trun_sound.death();
  playerObject.alive = false;
  endGame();
  setTimeout( function() {
    gameOverAlert(message);
  }, 500 );
}

function gameOverAlert(message) {
  let string = "Game Over: " + message;
  string += "\n" + "Difficulty: " + difficulty;
  string += "\n" + "Score: " + playerObject.score;
  window.alert(string);
  setTimeout(startGame, 500);
}

function endGame() {
  var i, j, array;
  array = mapObject.boomAlert;
  for (i = 0; i < array.length; i++)
    if ( array[i] )
      for (j = 0; j < array[i].length; j++)
        clearTimeout( array[i][j] );
  array = mapObject.fireAlert;
  for (i = 0; i < array.length; i++)
    if ( array[i] )
      for (j = 0; j < array[i].length; j++)
        clearTimeout( array[i][j] );
  clearTimeouts();
}

function clearTimeouts() {
  clearTimeout(timerPlayerPhasing);
  clearTimeout(timerPlayerFlash);
  clearTimeout(timerHeart);
  clearTimeout(timerExist);
  clearTimeout(timerMoveMob);
  clearTimeout(timerDraw);
  clearTimeout(timerInteractions);
  clearTimeout(timerMushroom);
  clearTimeout(timerPlayerFlash);
  clearTimeout(timerMovePlayer);
  clearTimeout(timerProximal);
}

function doIExist() {
  let value = map[playerObject.yPos][playerObject.xPos];
  if (value != 1) {
    newMessage("Overwritten by: " + value);
    gameOver("You (violently) ceased to exist.");
  } else {
    timerExist = setTimeout(doIExist, 50);
  }
}

function heartBeat() {
  if ( map[mapObject.height - 2][mapObject.width - 2] != 2 ) {
    mapObject.removeMob(mapObject.width - 2, mapObject.height - 2);
    map[mapObject.height - 2][mapObject.width - 2] = 2;
  }
  let dead = false;
  if (life < 1) {
    gameOver("You collapsed.");
    dead = true;
  }
  if (timer < 1) {
    gameOver("You didn't make it in time.");
    dead = true;
  } else {
    if (timerBit) timer -= 1;
    timerBit = !timerBit;
  }
  if (!dead) timerHeart = setTimeout(heartBeat, 500);
}

function newMessage(message) {
  for (let i = MESSAGE_QUEUE_MAX - 1; i > 0; i--)
    messageQueue[i] = messageQueue[i - 1];
  messageQueue[0] = message;
}

function newMap() {
  mapObject = trun_generate.map(difficulty);
  map = mapObject.mapArray;
  mapObject.boomAlert = [];
  mapObject.fireAlert = [];
}

function newGame() {
  restartPlayer();
  currentKeys = [];
  currentRoundCount += 1;
  newMap();
  messageQueue = [];
  for (var i = 0; i < MESSAGE_QUEUE_MAX; i++)
    newMessage("");
  newMessage("Tunnel Runner version 0.44e.20");
  newMessage("Type \"h\" at any time for help.");
  newMessage("Objective: Run the tunnel.");
  [life, timer] = [ DEFAULT_LIFE, Math.pow(2, 2 * 16) ];
  timerBit = false;
}

function restartPlayer() {
  playerObject.xPos            = 0;
  playerObject.yPos            = 0;
  playerObject.alive           = true;
  playerObject.flashBit        = false;
  playerObject.armour          = 0;
  playerObject.score           = 1;
  playerObject.hasShield       = false;
  playerObject.shieldCount     = 0;
  playerObject.hasPick         = false;
  playerObject.pickCount       = 0;
  playerObject.wielded         = "nothing";
  playerObject.powerMove       = false;
  playerObject.hitRecently     = 0;
  playerObject.blockRecently   = 0;
  playerObject.armourReduction = 0;
}

function colourPlayer(colour) {
  playerObject.blueBit  = false;
  playerObject.pinkBit  = false;
  playerObject.greenBit = false;
  if (colour === "b") {
    playerObject.blueBit = true;
    playerObject.colour  = "#00FFFF";
  } else if (colour === "p") {
    playerObject.pinkBit = true;
    playerObject.colour  = COLOR_PINK;
  } else if (colour === "g") {
    playerObject.greenBit = true;
    playerObject.colour   = "#00FF00";
  }
}

function startGame() {
  var input, done, colorSelect;
  newGame();
  if (map.length < 5 || map[0].length < 5)
    throw new Error("Illegal map dimensions.");
  done = false;
  if (playerObject.pinkBit) {
    colorSelect = "p";
  } else if (playerObject.greenBit) {
    colorSelect = "g";
  } else {
    colorSelect = "b";
  }
  colourPlayer(colorSelect);
  timerHeart = setTimeout(heartBeat, 500);
  timerExist = setTimeout(doIExist, 50);
  timerMoveMob = setTimeout(moveRandomMob, RANDOM_MOB_INTERVAL);
  timerInteractions = setTimeout(playerInteractions, 25);
  timerMushroom = setTimeout(randomMush, 30);
  timerPaint = setTimeout(canvasPaint, 25);
  timerProximal = setTimeout(proximalActivations, PROX_MOB_INTERVAL);
  playerPhase();
}

let pic = new Image();
pic.src = "res/no_idea.png";
pic.onload = function() { }
let block_pic = new Image();
block_pic.src = "res/block.png";
block_pic.onload = function() { }
let scratch_pic = new Image();
scratch_pic.src = "res/scratch.png";
scratch_pic.onload = function() { }
let slimy_pic = new Image();
slimy_pic.src = "res/slimy.png";
slimy_pic.onload = function() { }

let canvas = document.getElementById('canvas');
let canvasWidth = canvas.width;
let canvasHeight = canvas.height;

let context = canvas.getContext('2d');
context.fillStyle = "rgb(200,100,50)";
context.strokeStyle="#FF0000";

canvas.addEventListener( "mousedown", function(event) {
  let [xPos, yPos] = [playerObject.xPos, playerObject.yPos];
  event.preventDefault();
  var xp = event.offsetX * canvas.width / canvas.clientWidth | 0;
  var yp = event.offsetY * canvas.height / canvas.clientHeight | 0;
  if ( yp > (512 / 16 * 8) && yp < (512 / 16 * 9) )
    if (xp < 512 / 16 * 8) {
      move("w", xPos, yPos, MAP_VAL_PLAYER);
    } else if (xp > 512 / 16 * 9) {
      move("e", xPos, yPos, MAP_VAL_PLAYER);
    }
  if ( xp > (512 / 16 * 8) && xp < (512 / 16 * 9) )
    if (yp < 512 / 16 * 8) {
      move("n", xPos, yPos, MAP_VAL_PLAYER);
    } else if (yp > 512 / 16 * 9) {
      move("s", xPos, yPos, MAP_VAL_PLAYER);
    }
} );

startGame();

}() );

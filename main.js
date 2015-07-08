/*
TODO
*/
(function TMGame ()
{

var HIT_SOUND_FILENAME = "augh.wav";
var DEATH_SOUND_FILENAME = "death.wav";
var WIN_SOUND_FILENAME = "woohoo.wav";
var KEY_CODE_W = 87;
var KEY_CODE_A = 65;
var KEY_CODE_S = 83;
var KEY_CODE_D = 68;
var MAP_VAL_EMPTY = 0;
var MAP_VAL_PLAYER = 1;
var MAP_VAL_MOB = 3;
var COLOR_PINK = "#FF66FF";
var map;
var mapString;
var xPos;
var yPos;
var directions;
var currentMessage;
var life;
var hitSound;

hitSound = new Audio(HIT_SOUND_FILENAME);
deathSound = new Audio(DEATH_SOUND_FILENAME);
winSound = new Audio(WIN_SOUND_FILENAME);

currentMessage = '<font color="' + "lime" + '">Objective: Save the '+ '</font><font color="' + COLOR_PINK + '">!</font>';

life = 64;

directions = ["n", "s", "e", "w"];

xPos = 0;
yPos = 0;

map = [
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,3,0,0,0,0,8,0,0,0,3,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,8,0,0,0,0],
[0,0,3,0,0,0,0,0,0,0,3,0,0,0,0,3,0,0,0,0,0,4,4,4,4,0,8,0,0,0,0,0,0],
[0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,7,0,0,0,0,4,4,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0],
[0,0,0,0,0,0,7,0,0,0,0,4,4,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,5,0,5,0,0],
[0,0,0,7,0,0,7,0,0,0,0,3,0,0,9,3,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,5,0],
[0,0,8,0,0,0,0,0,0,0,0,0,0,8,0,0,0,9,0,0,0,0,0,0,0,8,0,0,0,0,6,0,0],
[0,0,0,0,0,0,7,0,0,0,3,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,0,0],
[7,0,0,7,0,0,8,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0],
[0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,3,0,0,0,0,0,4,4,0,0,0,0,0,5,5,5,2,0],
[0,7,0,7,0,0,0,0,4,4,0,0,0,0,0,3,0,0,0,0,6,4,4,0,0,0,0,0,0,5,7,9,9],
[0,7,0,0,0,0,0,0,0,0,0,0,6,0,0,3,0,5,0,0,0,0,0,0,0,0,7,0,0,0,0,9,9],
];
/*
map = [
    [1, 0, 0, 0],
    [3, 0, 0, 0],
    [3, 0, 0, 0],
    [3, 0, 0, 0],
];
*/

function validTile(newX, newY)
{
    var result;
    var mapWidth;
    var mapHeight;
    var notTooSmall;
    var notTooBig;

    result = false;
    mapWidth = map[0].length;
    mapHeight = map.length;

    if (newX >= 0 && newY >= 0)
    {
            notTooSmall = true;
    }
    if (newX < mapWidth && newY < mapHeight)
    {
        notTooBig = true;
    }

    if (notTooSmall && notTooBig)
    {
        result = true;
    }

    return result;
}

function validMove(newX, newY)
{
    var result;

    result = false;
    if (validTile(newX, newY))
    {
        if (map[newY][newX] == 0)
        {
            result = true;
        }
    }

    return result;
}
'<font color="#FF66FF">!</font>'
function moveRandomMob()
{
    var randomX;
    var randomY;
    var randomDirection;
    var mover;
    var destination;

    randomX = Math.floor(Math.random() * map[0].length);
    randomY = Math.floor(Math.random() * map.length);
    
    randomDirection = directions[Math.floor(Math.random() * 4)];
    
    mover = map[randomY][randomX];
    if (mover > 2) 
    {
        if (mover != 7)
        {
            move(randomDirection, randomX, randomY, mover);
        }
        else
        {
            destination = move(randomDirection, randomX, randomY, mover);
            move(randomDirection, destination[0], destination[1], mover);
        }
    }

    setTimeout(moveRandomMob, 5);
}

function move(direction, originX, originY, value)
{
    var result;
    var offsetX;
    var offsetY;
    var newX;
    var newY;
    
    result = [];
    result[0] = originX;
    result[1] = originY;

    offsetX = 0;
    offsetY = 0;

    if (direction === "n")
    {
        offsetY = -1;
    }
    else if (direction === "e")
    {
        offsetX = 1;
    }
    else if (direction === "s")
    {
        offsetY = 1;
    }
    else if (direction === "w")
    {
        offsetX = -1;
    }

    newX = originX + offsetX;
    newY = originY + offsetY;

    if (validMove(newX, newY))
    {
        map[originY][originX] = 0;
        map[newY][newX] = value;
        result[0] = newX;
        result[1] = newY;
    }
    else
    {
    }

    return result;
}

document.onkeyup = function(e)
{
    var direction;
    var newCoords;
    var key = e.keyCode ? e.keyCode : e.which;
                
    direction = "";
    if (key == KEY_CODE_W)
    {
        direction = "n";
    }
    else if (key == KEY_CODE_D)
    {
        direction = "e";
    }
    else if (key == KEY_CODE_S)
    {
        direction = "s";
    }
    else if (key == KEY_CODE_A)
    {
        direction = "w";
    }

    if (direction === "")
    {
    }
    else
    {
        newCoords = move(direction, xPos, yPos, MAP_VAL_PLAYER);
        xPos = newCoords[0];
        yPos = newCoords[1];
    }
}

function mapToString(map)
{
    var i;
    var j;
    var result;

    result = "<h1><code>";
    for (i = 0; i < map.length; i++)
    {
        for (j = 0; j < map[0].length; j++)
        {
            result += '<font color="';
            if (map[i][j] == 0)
            {
                result += '#6B6B6B">.';
            }
            else if (map[i][j] == 1)
            {
                result += '#00FFFF">@';
            }
            else if (map[i][j] == 2)
            {
                result += COLOR_PINK;
                result += '">!';
            }
            else if (map[i][j] == 3)
            {
                result += '#000066">3';
            }
            else if (map[i][j] == 4)
            {
                result += '#0066FF">4';
            }
            else if (map[i][j] == 5)
            {
                result += '#66FF66">5';
            }
            else if (map[i][j] == 6)
            {
                result += '#FFFF66">6';
            }
            else if (map[i][j] == 7)
            {
                result += '#FF0066">7';
            }
            else if (map[i][j] == 8)
            {
                result += '#0000CC">8';
            }
            else if (map[i][j] == 9)
            {
                result += '#9900FF">9';
            }
            else
            {
                result += 'blue">';
                result += map[i][j];
            }
            result += '</font>';
        }
        result += "<br>";
    }

    result += "</code></h1><br>";
    return result;
}

function drawMap()
{
    mapString = mapToString(map);
    document.getElementById("left").innerHTML = mapString;
    document.getElementById("right").innerHTML = "<h2><3: " + life + "</h2><br>";
    document.getElementById("right").innerHTML += ("<h2>" + currentMessage + "</h2>");
    setTimeout(drawMap, 50);
}

function playerInteractions()
{
    var i;
    var j;
    for (i = -1; i < 2; i++)
    {
        for (j = -1; j < 2; j++)
        {
            if (validTile(xPos + j, yPos + i))
        {
            playerInteract(map[yPos + i][xPos + j]);
        }
        }
    }

    setTimeout(playerInteractions, 500);
}

function playerInteract(value)
{
    var random;

    if (value == 2)
    {
        winSound.play();
        document.write("You win!");
    }
    else if (value == 3)
    {
        hitSound.play();
        currentMessage = "3 bites you with glee!";
        life -= 1;
        random = Math.floor(Math.random() * 3);
        if (random == 0)
        {
            map[0][0] = 3;
        }
        else if (random == 1)
        {
            map[0][map[0].length - 1] = 3;
        }
        else if (random == 2)
        {
            map[map.length - 1][0] = 3;
        }
    }
    else if (value == 4)
    {
        hitSound.play();
        currentMessage = "4 roars with rage and smashes into you!";
        life -= 4;
        map[0][0] = 4;
        map[0][map[0].length - 1] = 4;
        map[map.length - 1][0] = 4;
        map[map.length - 1][map[0].length - 1] = 4;
    }
    else if (value == 5)
    {
        hitSound.play();
        currentMessage = "5 smacks you around like a rag doll!";
        life -= 16;
    }
    else if (value == 6)
    {
        currentMessage = "6 whistles a funeral dirge.";
        random = randomTile();
        map[random[1]][random[0]] = 7;
        random = randomTile();
        map[random[1]][random[0]] = 7;
        random = randomTile();
        map[random[1]][random[0]] = 7;
        random = randomTile();
        map[random[1]][random[0]] = 7;
        random = randomTile();
        map[random[1]][random[0]] = 7;
        random = randomTile();
        map[random[1]][random[0]] = 7;
    }
    else if (value == 7)
    {
        deathSound.play();
        document.write("Game over: 7 8 u.");
    }
}

function randomTile()
{
    var randomX;
    var randomY;
    var result;

    result = [];
    randomX = Math.floor(Math.random() * map[0].length);
    randomY = Math.floor(Math.random() * map.length);
    result[0] = randomX;
    result[1] = randomY;

    return result;
}

function heartBeat()
{
    if (life < 1)
    {
        document.write("Game over: You collapsed.");
        deathSound.play();
    }
    setTimeout(heartBeat, 500);
}

Blast = function(direction)
{
    this.direction = direction;
}

setTimeout(moveRandomMob, 25);
setTimeout(drawMap, 25);
setTimeout(playerInteractions, 25);
setTimeout(heartBeat, 500);

}());
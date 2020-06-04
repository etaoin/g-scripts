// ==UserScript==
// @name         Gladiatus Script
// @version      2.0
// @description  Dodatek do gry Gladiatus
// @author       Eryk Bodziony
// @match        *://*.gladiatus.gameforge.com/game/index.php*
// @exclude      *://*.gladiatus.gameforge.com/game/index.php?mod=start
// @downloadURL  https://github.com/ebodziony/gladiatus-script/raw/master/gladiatus-script.js
// @updateURL    https://github.com/ebodziony/gladiatus-script/raw/master/gladiatus-script.js
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// @resource     customCSS_global  https://raw.githubusercontent.com/ebodziony/gladiatus-script/master/global.css?ver=1.9
// ==/UserScript==


(function() {
    'use strict';

    // Add CSS

    function addCustomCSS(){

        var globalCSS = GM_getResourceText("customCSS_global");
        GM_addStyle(globalCSS);

    }
    addCustomCSS();

    /*****************
    *     Global     *
    *****************/

    var autoGoActive = false;
    if (sessionStorage.getItem('autoGoActive') !== null){
        let autoGoActiveText = sessionStorage.getItem('autoGoActive');
        autoGoActive = autoGoActiveText == "true";
    };

    var actualTime = new Date().getTime();

    var playerLevel = document.getElementById("header_values_level").firstChild.nodeValue;

    var nextActionCounter;

    var scriptVersion = "1.0";

    var healthPoints = Number(document.getElementById("header_values_hp_percent").firstChild.nodeValue.replace(/[^0-9]/gi, ''));

    /*****************
    *     Config     *
    *****************/

    //Mode
    var safeMode = false; //default true

    //Expedition
    var doExpedition = true;
    if (localStorage.getItem('doExpedition') !== null){
        let doExpeditionText = localStorage.getItem('doExpedition');
        doExpedition = doExpeditionText == "true";
    };
    var locationId = 7;
    var locationName = "Nie wybrano";
    var monsterId = 0;
    if (localStorage.getItem('monsterId') !== null){
        let monsterIdText = localStorage.getItem('monsterId');
        monsterId = parseInt(monsterIdText);
    };

    //Dungeon
    var doDungeon = true;
    if (localStorage.getItem('doDungeon') !== null){
        let doDungeonText = localStorage.getItem('doDungeon');
        doDungeon = doDungeonText == "true";
    };
    if (playerLevel < 10) {
        doDungeon = false;
    };
    var dungeonId = 0;
    var dungeonDifficulty = "zaawansowane";
    if (localStorage.getItem('dungeonDifficulty') !== null){
        dungeonDifficulty = localStorage.getItem('dungeonDifficulty');
    };

    //Arena
    var doArena = true;
    if (localStorage.getItem('doArena') !== null){
        let doArenaText = localStorage.getItem('doArena');
        doArena = doArenaText == "true";
    };
    if (playerLevel < 2) {
        doArena = false;
    };

    //Circus
    var doCircus = true;
    if (localStorage.getItem('doCircus') !== null){
        let doCircusText = localStorage.getItem('doCircus');
        doCircus = doCircusText == "true";
    };
    if (playerLevel < 10) {
        doCircus = false;
    };

    //Event Expedition
    var doEventExpedition = true;
    if (document.getElementById("submenu2").getElementsByClassName("menuitem glow")[0] === undefined){
        doEventExpedition = false;
    };
    var eventMonsterId = 0;
    var eventExpeditionTimerDone = true;
    if (sessionStorage.getItem('eventExpeditionTimer') !== null){
        eventExpeditionTimerDone = sessionStorage.getItem('eventExpeditionTimer') < actualTime;
    };
    var freeEventPoints = 16;
    if (sessionStorage.getItem('freeEventPoints') !== null){
        freeEventPoints = sessionStorage.getItem('freeEventPoints');
    };
    if (document.getElementById("submenu2").getElementsByClassName("menuitem glow")[0] === undefined){
        freeEventPoints = 0;
    };

    /*****************
    *  Translations  *
    *****************/

    const contentEN = {
        advanced: 'Advanced',
        arena: 'Arena',
        circusTurma: 'Circus Turma',
        difficulty: 'Difficulty',
        dungeon: 'Dungeon',
        expedition: 'Expedition',
        in: 'In',
        location: 'Location',
        nextAction: 'Next action',
        no: 'No',
        normal: 'Normal',
        opponent: 'Opponent',
        settings: 'Settings',
        soon: 'Soon...',
        yes: 'Yes'
    }

    const contentPL = {
        advanced: 'Zaawansowane',
        arena: 'Arena',
        circusTurma: 'Circus Turma',
        difficulty: 'Trudność',
        dungeon: 'Lochy',
        expedition: 'Wyprawa',
        in: 'Za',
        location: 'Lokacja',
        nextAction: 'Następna akcja',
        no: 'Nie',
        normal: 'Normalne',
        opponent: 'Przeciwnik',
        settings: 'Ustawienia',
        soon: 'Wkrótce...',
        yes: 'Tak'
    }

    let content;

    const language = localStorage.getItem('settings.language')

    switch (language) {
        case 'EN':
            content = { ...contentEN }
            break;
        case 'PL':
            content = { ...contentPL }
            break;
        default:
            content = { ...contentEN }
    }


    /****************
    *   Interface   *
    ****************/

    //Set Auto Go Active
    var setAutoGoActive = function() {
        sessionStorage.setItem('autoGoActive', true);
        document.getElementById("autoGoButton").innerHTML = 'STOP'
        document.getElementById("autoGoButton").removeEventListener ("click", setAutoGoActive);
        document.getElementById("autoGoButton").addEventListener ("click", setAutoGoDeactive);
        autoGo();
    };

    //Set Auto Go Deactive
    var setAutoGoDeactive = function() {
        sessionStorage.setItem('autoGoActive', false);
        document.getElementById("autoGoButton").innerHTML = 'Auto GO'
        document.getElementById("autoGoButton").addEventListener ("click", setAutoGoActive);
        document.getElementById("autoGoButton").removeEventListener ("click", setAutoGoDeactive);

        clearTimeout(setTimeout);

        if (document.getElementById("nextActionWindow") !== null) {
            document.getElementById("nextActionWindow").remove();
        };

    };

    //Open Settings
    var openSettings = function(){

        var closeSettings = function() {
            document.getElementById("settingsWindow").remove();
            document.getElementById("overlayBack").remove();
        };

        var settingsWindow = document.createElement("div");
            settingsWindow.setAttribute("id", "settingsWindow")
            settingsWindow.innerHTML = `
                <span id="settingsLanguage">
                    <img id="languageEN" src="https://raw.githubusercontent.com/ebodziony/gladiatus-script/master/assets/GB.png">
                    <img id="languagePL" src="https://raw.githubusercontent.com/ebodziony/gladiatus-script/master/assets/PL.png">
                </span>
                <span id="settingsHeader">${content.settings}</span>
                <div id="settingsContent">
                    <div>
                        <div class="settingsHeaderBig">${content.expedition}</div>
                        <div class="settingsSubcontent">
                            <div id="doExpeditionTrue" class="settingsButton">${content.yes}</div>
                            <div id="doExpeditionFalse" class="settingsButton">${content.no}</div>
                        </div>
                        <div class="settingsHeaderSmall">${content.opponent}</div>
                        <div class="settingsSubcontent">
                            <div id="setMonsterId0" class="settingsButton">1</div>
                            <div id="setMonsterId1" class="settingsButton">2</div>
                            <div id="setMonsterId2" class="settingsButton">3</div>
                            <div id="setMonsterId3" class="settingsButton">Boss</div>
                        </div>
                        <div class="settingsHeaderSmall">${content.location}</div>
                        <div class="settingsSubcontent">
                            <div id="zzz" class="settingsButton">${content.soon}</div>
                        </div>
                    </div>

                    <div>
                        <div class="settingsHeaderBig">${content.dungeon}</div>
                        <div class="settingsSubcontent">
                            <div id="doDungeonTrue" class="settingsButton">${content.yes}</div>
                            <div id="doDungeonFalse" class="settingsButton">${content.no}</div>
                        </div>
                        <div class="settingsHeaderSmall">${content.difficulty}</div>
                        <div class="settingsSubcontent">
                            <div id="setDungeonDifficultyNormalne" class="settingsButton">${content.normal}</div>
                            <div id="setDungeonDifficultyZaawansowane" class="settingsButton">${content.advanced}</div>
                        </div>
                        <div class="settingsHeaderSmall">${content.location}</div>
                        <div class="settingsSubcontent">
                            <div id="dungeonLocation" class="settingsButton">${content.soon}</div>
                        </div>
                    </div>

                    <div>
                        <div class="settingsHeaderBig">${content.arena}</div>
                        <div class="settingsSubcontent">
                            <div id="doArenaTrue" class="settingsButton">${content.yes}</div>
                            <div id="doArenaFalse" class="settingsButton">${content.no}</div>
                        </div>
                    </div>

                    <div>
                        <div class="settingsHeaderBig">${content.circusTurma}</div>
                        <div class="settingsSubcontent">
                            <div id="doCircusTrue" class="settingsButton">${content.yes}</div>
                            <div id="doCircusFalse" class="settingsButton">${content.no}</div>
                        </div>
                    </div>
                </div>`;
        document.getElementById("header_game").insertBefore(settingsWindow, document.getElementById("header_game").children[0]);

        var overlayBack = document.createElement("div");
            var wrapperHeight = document.getElementById("wrapper_game").clientHeight;
            overlayBack.setAttribute("id", "overlayBack");
            overlayBack.setAttribute("style", "height: " + wrapperHeight + "px;");
            overlayBack.addEventListener ("click", closeSettings);
        document.getElementsByTagName("body")[0].appendChild(overlayBack);

        //Set Language

        const setLanguage = function(language) {
            localStorage.setItem('settings.language', language)

            switch (language) {
                case 'EN':
                    content = { ...contentEN }
                    break;
                case 'PL':
                    content = { ...contentPL }
                    break;
                default:
                    content = { ...contentEN }
            }

            closeSettings();
            openSettings();
        };

        $("#languageEN").click(function() { setLanguage('EN') });
        $("#languagePL").click(function() { setLanguage('PL') });


        //Change Settings

        const setDoExpedition = function(bool) {
            doExpedition = bool;
            localStorage.setItem('doExpedition', bool);
            setActiveButtons();
        };

        $("#doExpeditionTrue").click(function() { setDoExpedition(true) });
        $("#doExpeditionFalse").click(function() { setDoExpedition(false) });

        const setMonster = function(id) {
            monsterId = id;
            localStorage.setItem('monsterId', id);
            setActiveButtons();
        };

        $("#setMonsterId0").click(function() { setMonster('0') });
        $("#setMonsterId1").click(function() { setMonster('1') });
        $("#setMonsterId2").click(function() { setMonster('2') });
        $("#setMonsterId3").click(function() { setMonster('3') });

        const setDoDungeon = function(bool) {
            doDungeon = bool;
            localStorage.setItem('doDungeon', bool);
            setActiveButtons();
        };

        $("#doDungeonTrue").click(function() { setDoDungeon(true) });
        $("#doDungeonFalse").click(function() { setDoDungeon(false) });

        const setDungeonDifficulty = function(difficulty) {
            dungeonDifficulty = difficulty;
            localStorage.setItem('dungeonDifficulty', difficulty);
            setActiveButtons();
        };

        $("#setDungeonDifficultyNormalne").click(function() { setDungeonDifficulty("normalne") });
        $("#setDungeonDifficultyZaawansowane").click(function() { setDungeonDifficulty("zaawansowane") });

        const setDoArena = function(bool) {
            doArena = bool;
            localStorage.setItem('doArena', bool);
            setActiveButtons();
        };

        $("#doArenaTrue").click(function() { setDoArena(true) });
        $("#doArenaFalse").click(function() { setDoArena(false) });

        const setDoCircus = function(bool) {
            doCircus = bool;
            localStorage.setItem('doCircus', bool);
            setActiveButtons();
        };

        $("#doCircusTrue").click(function() { setDoCircus(true) });
        $("#doCircusFalse").click(function() { setDoCircus(false) });

        var setActiveButtons = function() {
            if (doExpedition == true){
                document.getElementById("doExpeditionTrue").classList.add("settingsActive")
                document.getElementById("doExpeditionFalse").classList.remove("settingsDeactive")
            }
            else {
                document.getElementById("doExpeditionFalse").classList.add("settingsDeactive")
                document.getElementById("doExpeditionTrue").classList.remove("settingsActive")
            };
    
            if (monsterId == 0){
                document.getElementById("setMonsterId0").classList.add("settingsActive")
                document.getElementById("setMonsterId1").classList.remove("settingsActive")
                document.getElementById("setMonsterId2").classList.remove("settingsActive")
                document.getElementById("setMonsterId3").classList.remove("settingsActive")
            }
            else if (monsterId == 1){
                document.getElementById("setMonsterId1").classList.add("settingsActive")
                document.getElementById("setMonsterId0").classList.remove("settingsActive")
                document.getElementById("setMonsterId2").classList.remove("settingsActive")
                document.getElementById("setMonsterId3").classList.remove("settingsActive")
            }
            else if (monsterId == 2){
                document.getElementById("setMonsterId2").classList.add("settingsActive")
                document.getElementById("setMonsterId0").classList.remove("settingsActive")
                document.getElementById("setMonsterId1").classList.remove("settingsActive")
                document.getElementById("setMonsterId3").classList.remove("settingsActive")
            }
            else {
                document.getElementById("setMonsterId3").classList.add("settingsActive")
                document.getElementById("setMonsterId0").classList.remove("settingsActive")
                document.getElementById("setMonsterId1").classList.remove("settingsActive")
                document.getElementById("setMonsterId2").classList.remove("settingsActive")
            };
    
            if (doDungeon == true){
                document.getElementById("doDungeonTrue").classList.add("settingsActive")
                document.getElementById("doDungeonFalse").classList.remove("settingsDeactive")
            }
            else {
                document.getElementById("doDungeonFalse").classList.add("settingsDeactive")
                document.getElementById("doDungeonTrue").classList.remove("settingsActive")
            };
    
            if (dungeonDifficulty == "zaawansowane"){
                document.getElementById("setDungeonDifficultyZaawansowane").classList.add("settingsActive")
                document.getElementById("setDungeonDifficultyNormalne").classList.remove("settingsActive")
            }
            else {
                document.getElementById("setDungeonDifficultyNormalne").classList.add("settingsActive")
                document.getElementById("setDungeonDifficultyZaawansowane").classList.remove("settingsActive")
            };
    
            if (doArena == true){
                document.getElementById("doArenaTrue").classList.add("settingsActive")
                document.getElementById("doArenaFalse").classList.remove("settingsDeactive")
            }
            else {
                document.getElementById("doArenaFalse").classList.add("settingsDeactive")
                document.getElementById("doArenaTrue").classList.remove("settingsActive")
            };
    
            if (doCircus == true){
                document.getElementById("doCircusTrue").classList.add("settingsActive")
                document.getElementById("doCircusFalse").classList.remove("settingsDeactive")
            }
            else {
                document.getElementById("doCircusFalse").classList.add("settingsDeactive")
                document.getElementById("doCircusTrue").classList.remove("settingsActive")
            };
        };

        setActiveButtons();

    };

    //Auto GO button
    var autoGoButton = document.createElement("button");
    autoGoButton.setAttribute("id", "autoGoButton")
    autoGoButton.className = 'menuitem';

    if (autoGoActive == false){
        autoGoButton.innerHTML = 'Auto GO';
        autoGoButton.addEventListener ("click", setAutoGoActive);
    }

    else {
        autoGoButton.innerHTML = 'STOP';
        autoGoButton.addEventListener ("click", setAutoGoDeactive);
    };

    document.getElementById("mainmenu").insertBefore(autoGoButton, document.getElementById("mainmenu").children[0]);

    //Settings button
    var settingsButton = document.createElement("button");
    settingsButton.className = 'menuitem';
    settingsButton.innerHTML = '<img src="https://image.flaticon.com/icons/svg/76/76716.svg" title="Ustawienia" height="20" width="20" style="filter: invert(83%) sepia(52%) saturate(503%) hue-rotate(85deg) brightness(103%) contrast(101%); z-index: 999;">';
    settingsButton.setAttribute("style", "height: 27px; width: 27px; cursor: pointer; border: none; color: #5dce5d; padding: 0; background-image: url('https://i.imgur.com/jf7BXTX.png')" );
    settingsButton.addEventListener ("click", openSettings);
    document.getElementById("mainmenu").insertBefore(settingsButton, document.getElementById("mainmenu").children[1]);

    /****************
    *    Auto Go    *
    ****************/

    var autoGo = function() {

        //Click Delay 0.9 - 2.4 s

        function getRandomIntInclusive(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        var clickDelay = getRandomIntInclusive(900, 2400);

        //Claim Daily Reward

        if (document.getElementById("blackoutDialogLoginBonus") !== null) {
            setTimeout(function(){
                document.getElementById("blackoutDialogLoginBonus").getElementsByTagName("input")[0].click();
            }, clickDelay);
        };

        //Close Notifications

        if (document.getElementById("blackoutDialognotification") !== null && document.getElementById("blackoutDialognotification").isDisplayed()) { //isVisible()
            setTimeout(function(){
                document.getElementById("blackoutDialognotification").getElementsByTagName("input")[0].click();
            }, clickDelay);
        };

        /***************
        *   Use Food   *
        ***************/

        if (healthPoints < 10) {
            //do zrobienia
            console.log("Za mało punktów życia");
        }

        /****************
        * Go Expedition *
        ****************/

        else if (doExpedition === true && document.getElementById("cooldown_bar_fill_expedition").classList.contains("cooldown_bar_fill_ready")===true) {
            var goExpedition = function() {

                var expeditionPageCheck = document.getElementsByTagName("body")[0].id === "locationPage";

                if (expeditionPageCheck === false) {
                    document.getElementsByClassName("cooldown_bar_link")[0].click();
                }

                //document.getElementById("submenu2").getElementsByTagName("a")[1].getAttribute("href").contains("location&loc="+locationId);

                else { 
                    document.getElementsByClassName("expedition_button")[monsterId].click();
                };
            };

            setTimeout(function(){
                goExpedition();
            }, clickDelay);

        }

        /**************
        * Go Dungeon  *
        **************/

        else if (doDungeon === true && document.getElementById("cooldown_bar_fill_dungeon").classList.contains("cooldown_bar_fill_ready")===true) {
            var goDungeon = function() {

                var dungeonPageCheck = document.getElementsByTagName("body")[0].id === "dungeonPage";

                if (dungeonPageCheck === false) {
                    document.getElementsByClassName("cooldown_bar_link")[1].click();
                }

                else {
                    if (document.getElementById("content").getElementsByClassName("button1")[0].value === "normalne") {
                        if (dungeonDifficulty === "zaawansowane") {
                            document.getElementById("content").getElementsByClassName("button1")[1].click();
                        }
                        else {
                            document.getElementById("content").getElementsByClassName("button1")[0].click();
                        }
                    }

                    else {
                        document.getElementsByTagName("area")[0].click();
                    };
                };
            };

            setTimeout(function(){
                goDungeon();
            }, clickDelay);
        }

        /************************
        * Go Arena Provinciarum *
        ************************/

        else if (doArena === true && document.getElementById("cooldown_bar_fill_arena").classList.contains("cooldown_bar_fill_ready")===true) {
            var goArena = function() {

                var arenaPageCheck = document.getElementsByTagName("body")[0].id === "arenaPage";

                if (arenaPageCheck === false && playerLevel < 10) {
                    document.getElementsByClassName("cooldown_bar_link")[1].click();
                }

                else if (arenaPageCheck === false) {
                    document.getElementsByClassName("cooldown_bar_link")[2].click();
                }

                else {

                    var arenaProvPageCheck = document.getElementsByTagName("td")[1].firstChild.hasClass("awesome-tabs current");

                    if (arenaProvPageCheck === false) {
                        document.getElementsByTagName("td")[1].firstElementChild.click();
                    }

                    else { 
                        var levels = new Array();
                        levels[0] = Number(document.getElementById("own2").getElementsByTagName("td")[1].firstChild.nodeValue)
                        levels[1] = Number(document.getElementById("own2").getElementsByTagName("td")[5].firstChild.nodeValue)
                        levels[2] = Number(document.getElementById("own2").getElementsByTagName("td")[9].firstChild.nodeValue)
                        levels[3] = Number(document.getElementById("own2").getElementsByTagName("td")[13].firstChild.nodeValue)
                        levels[4] = Number(document.getElementById("own2").getElementsByTagName("td")[17].firstChild.nodeValue)

                        var index = 0;
                        var minValue = levels[0];
                        for (var i = 1; i < levels.length; i++) {
                            if (levels[i] < minValue) {
                                minValue = levels[i];
                                index = i;
                            }
                        };
                
                        document.getElementsByClassName("attack")[index].click();
                    }
                }
            };

            setTimeout(function(){
                goArena();
            }, clickDelay+600);

        }

        /*************************
        * Go Circus Provinciarum *
        *************************/

        else if (doCircus === true && document.getElementById("cooldown_bar_fill_ct").classList.contains("cooldown_bar_fill_ready")===true) {
            var goCircus = function() {

                var arenaPageCheck = document.getElementsByTagName("body")[0].id === "arenaPage";

                if (arenaPageCheck === false) {
                    document.getElementsByClassName("cooldown_bar_link")[3].click();
                }

                else {

                    var circusProvPageCheck = document.getElementsByTagName("td")[3].firstChild.hasClass("awesome-tabs current");

                    if (circusProvPageCheck === false) {
                        document.getElementsByTagName("td")[3].firstElementChild.click();
                    }

                    else { 
                        var levels = new Array();
                        levels[0] = Number(document.getElementById("own3").getElementsByTagName("td")[1].firstChild.nodeValue)
                        levels[1] = Number(document.getElementById("own3").getElementsByTagName("td")[5].firstChild.nodeValue)
                        levels[2] = Number(document.getElementById("own3").getElementsByTagName("td")[9].firstChild.nodeValue)
                        levels[3] = Number(document.getElementById("own3").getElementsByTagName("td")[13].firstChild.nodeValue)
                        levels[4] = Number(document.getElementById("own3").getElementsByTagName("td")[17].firstChild.nodeValue)

                        var index = 0;
                        var minValue = levels[0];
                        for (var i = 1; i < levels.length; i++) {
                            if (levels[i] < minValue) {
                                minValue = levels[i];
                                index = i;
                            }
                        };

                        document.getElementsByClassName("attack")[index].click();
                    };
                };
            };

            setTimeout(function(){
                goCircus();
            }, clickDelay+600);

        }

        /************************
        *  Go Event Expedition  *
        ************************/

        else if (doEventExpedition === true && eventExpeditionTimerDone===true && freeEventPoints > 0) {
            var goEventExpedition = function() {

                var expeditionPageCheck = document.getElementsByTagName("body")[0].id === "locationPage";
                var eventExpeditionNameCheck = document.getElementById("mainnav").getElementsByTagName("a")[0].firstChild.nodeValue;

                if (expeditionPageCheck === false || document.getElementById("submenu2").getElementsByClassName("menuitem glow")[0].firstChild.nodeValue.contains(eventExpeditionNameCheck) === false) {
                    document.getElementById("submenu2").getElementsByClassName("menuitem glow")[0].click();
                }

                else if (document.getElementById("content").getElementsByClassName("section-header")[0].getElementsByTagName("p")[1].firstChild.nodeValue.replace(/[^0-9]/gi, '') <= 0 ) {
                    sessionStorage.setItem('freeEventPoints', 0); //sprawdzam czy jest co najmniej 1 punkt eventowy
                    location.reload();
                }

                else if (document.getElementById("content").getElementsByClassName("section-header")[1].getElementsByTagName("span")[0]===undefined) {
                    freeEventPoints = document.getElementById("content").getElementsByClassName("section-header")[0].getElementsByTagName("p")[1].firstChild.nodeValue.replace(/[^0-9]/gi, '');

                    if (eventMonsterId == 3 && freeEventPoints == 1 ) {
                        sessionStorage.setItem('freeEventPoints', 0);
                        sessionStorage.setItem('eventExpeditionTimer', actualTime+301000);
                        document.getElementsByClassName("expedition_button")[2].click();
                    }

                    else {
                        if (eventMonsterId == 3 && freeEventPoints > 1) {
                            document.getElementsByClassName("expedition_button")[3].click();
                            sessionStorage.setItem('freeEventPoints', freeEventPoints - 2);
                            sessionStorage.setItem('eventExpeditionTimer', actualTime+301000);
                        }
                        else {
                            document.getElementsByClassName("expedition_button")[eventMonsterId].click();
                            sessionStorage.setItem('freeEventPoints', freeEventPoints - 1);
                            sessionStorage.setItem('eventExpeditionTimer', actualTime+301000);
                        };
                    };
                }

                else {
                    //document.getElementById("content").getElementsByClassName("section-header")[1].getElementsByTagName("span")[0].firstChild.nodeValue.replace(/[^:0-9]/gi, '')
                    sessionStorage.setItem('eventExpeditionTimer', actualTime+300000); //sprawdzam czy załadował się czas
                    location.reload();
                };
            };

            setTimeout(function(){
                goEventExpedition();
            }, clickDelay);

        }

        /***********************
        * Wait for Next Action *
        ***********************/

        else {

            /******************
            *    Fast Mode    *
            ******************/

            if (safeMode===false) {

                var convertTimeToMs = function(t) {
                    var ms = Number(t.split(':')[0]) * 60 * 60 * 1000 + Number(t.split(':')[1]) * 60 * 1000 + Number(t.split(':')[2]) * 1000;
                    return ms;
                };
    
                var nextActionTime = new Array();
    
                if (doExpedition === true) {
                    nextActionTime[0] = convertTimeToMs(document.getElementById("cooldown_bar_text_expedition").innerText);
                };
                if (doDungeon === true) {
                    nextActionTime[1] = convertTimeToMs(document.getElementById("cooldown_bar_text_dungeon").innerText);
                };
                if (doArena === true) {
                    nextActionTime[2] = convertTimeToMs(document.getElementById("cooldown_bar_text_arena").innerText);
                };
                if (doCircus === true) {
                    nextActionTime[3] = convertTimeToMs(document.getElementById("cooldown_bar_text_ct").innerText);
                };
                if (doEventExpedition === true && freeEventPoints > 0) {
                    nextActionTime[4] = sessionStorage.getItem('eventExpeditionTimer') - actualTime;
                };
    
                var index = 0;
                var minValue = nextActionTime[0];
                for (var i = 1; i < nextActionTime.length; i++) {
                    if (nextActionTime[i] < minValue) {
                        minValue = nextActionTime[i];
                        index = i;
                    }
                };
    
                var nextActionName;
    
                if (index === 0) {
                    nextActionName = content.expedition;
                }
                else if (index === 1) {
                    nextActionName = content.dungeon;
                }
                else if (index === 2) {
                    nextActionName = content.arena;
                }
                else if (index === 3) {
                    nextActionName = content.circusTurma;
                }
                else if (index === 4) {
                    nextActionName = "Event expedition";
                }
                else {
                    nextActionName = "Unkown";
                };
    
                var convertTimeToDate = function(timeInMs) {
                    var timeInSecs = timeInMs / 1000;
                    timeInSecs = Math.round(timeInSecs);
                    var secs = timeInSecs % 60;
                    if (secs < 10) {
                        secs = "0" + secs;
                    };
                    timeInSecs = (timeInSecs - secs) / 60;
                    var mins = timeInSecs % 60;
                    if (mins < 10) {
                        mins = "0" + mins;
                    };
                    var hrs = (timeInSecs - mins) / 60;
    
                    return hrs + ':' + mins + ':' + secs;
                };
    
                var nextActionWindow = document.createElement("div");
    
                var showNextActionWindow = function() {
                    nextActionWindow.setAttribute("id", "nextActionWindow")
                    nextActionWindow.setAttribute("style", "height: 72px; width: 365px; padding-top: 13px; color: #58ffbb; font-size: 20px; background-color: #000000aa; border-radius: 15px; display: block; position: absolute; left: 506px; top: 120px; z-index: 999;" );
                    nextActionWindow.innerHTML = `<span style="color: #fff;">${content.nextAction}: </span><span>${nextActionName}</span></br><span style="color: #fff;">${content.in}: </span><span>${convertTimeToDate(nextActionTime[index])}</span>`;
                    document.getElementById("header_game").insertBefore(nextActionWindow, document.getElementById("header_game").children[0]);
                };
                showNextActionWindow();
    
                nextActionCounter = setInterval(function() {
                    nextActionTime[index] = nextActionTime[index]-1000;
    
                    nextActionWindow.innerHTML = `<span style="color: #fff;">${content.nextAction}: </span><span>${nextActionName}</span></br><span style="color: #fff;">${content.in}: </span><span>${convertTimeToDate(nextActionTime[index])}</span>`;
    
                    if (nextActionTime[index]<=0) {
                        if (index === 4) {
                            document.getElementById("submenu2").getElementsByClassName("menuitem glow")[0].click();
                        }
                        else {
                            setTimeout(function(){
                                document.getElementsByClassName("cooldown_bar_link")[index].click();
                            }, clickDelay);
                        };
                    };
                }, 1000);
            }

            /******************
            *    Safe Mode    *
            ******************/

            else {
                //do zrobienia
                console.log("No safe mode yet")
            };
        };
    };

    if (autoGoActive == true) {
        window.onload = autoGo();
    };

})();
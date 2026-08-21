      let teamModeMatch = msg.match(new RegExp("^" + escapeRegExp(PREFIX) + "(?:채린|ㅊㄹ)([23])?$"));
      if (teamModeMatch) {
        let mode = parseInt(teamModeMatch[1]) || 1;
        let requiredPlayers = mode * 2;
        let countedByPracticeConversion = false;
        if (!WORD_SET) {
          replier.reply("단어 로드 필요 (" + ADMIN_PFX + " listload)");
          return;
        }
        if (game && game.isPractice) {
          let preservedHumans = getHumanPlayers(game);
          countedByPracticeConversion = preservedHumans.indexOf(sender) === -1;
          if (countedByPracticeConversion) preservedHumans.push(sender);
          if (preservedHumans.length > requiredPlayers) {
            replier.reply("현재 일반 참가 인원이 너무 많아 " + mode + "대" + mode + "로 전환할 수 없습니다.");
            return;
          }
          game = replaceRoomWithHumanLobby(room, mode, preservedHumans, gameSlot);
          gameSlot = game.slotId;
          replier.reply(joinFoldedLines([systemLine("일반게임 우선 규칙으로 기존 연습 " + slotLabel(gameSlot) + "이 즉시 종료된다."), systemLine("같은 방에서 일반 대기열로 전환한다.")], [systemLine("현재 일반 참가자: " + (game.players.length > 0 ? game.players.join(", ") : "없음"))]));
        }
        let activeGameInfo = findPlayerGame(room, sender);
        if (activeGameInfo && !countedByPracticeConversion) {
          replySystem(replier, sender + "은 이미 " + slotLabel(activeGameInfo.slot) + " 게임에 참가 중이다.");
          return;
        }
        let joinInfo = findJoinableLobby(room, mode, false);
        if (joinInfo && joinInfo.game.gameType === "normal") joinInfo = null;
        if (joinInfo) {
          gameSlot = joinInfo.slot;
          game = joinInfo.game;
        } else {
          if (getRoomSlotIds(room).length >= 26) {
            replier.reply("이 방에서 동시에 진행할 수 있는 게임은 최대 26개(#A~#Z)이다.");
            return;
          }
          gameSlot = allocGameSlot(room);
          if (!gameSlot) {
            replier.reply("이 방에서 동시에 진행할 수 있는 게임은 최대 26개(#A~#Z)이다.");
            return;
          }
          game = createBaseGameState(mode);
          setRoomGame(room, gameSlot, game);
        }
        if (game.teamMode !== mode && game.players.length === 0) {
          game.teamMode = mode;
          game.teamLives = [mode, mode];
          game.teamStates = [{}, {}];
        } else if (game.players.length > 0 && game.teamMode !== mode) {
          replier.reply("게임 " + slotLabel(gameSlot) + "은 이미 " + game.teamMode + "대" + game.teamMode + " 모드로 대기 중이다.");
          return;
        }
        if (game.players.includes(sender)) {
          if (!countedByPracticeConversion) {
            replySystem(replier, sender + "은 이미 " + slotLabel(gameSlot) + "에 참가했다.");
            return;
          }
        } else {
          if (game.players.length >= requiredPlayers) {
            replySystem(replier, slotLabel(gameSlot) + " 게임 정원이 가득 찼다.");
            return;
          }
          game.players.push(sender);
          if (S.touchLobby) S.touchLobby(game);
        }
        replySystem(replier, sender + "이 " + slotLabel(gameSlot) + "에 참가했다. 현재 " + game.players.length + "/" + requiredPlayers + "명이다.");
        if (game.players.length === requiredPlayers) {
          game.started = true;
          game.isPractice = false;
          game.playerStates = {};
          game.mapApplied = false;
          game.selectedMap = null;
          if (Bot.combat) Bot.combat.applyRoomDefault(room, game);
          if (S.__combatMode && S.__combatMode.combatModeOn(game)) {
            replier.reply(systemLine("게임 " + slotLabel(gameSlot) + " 참가 인원이 모였다. (조합 모드)"));
            S.__combatMode.startCombatDraft(game, room, replier);
            return;
          }
          game.phase = "job_selection";
          game.firstPicker = null;
          game.banPhase = false;
          game.bannedJobs = [];
          replier.reply(joinFoldedLines([systemLine("게임 " + slotLabel(gameSlot) + " 참가 인원이 모였다."), systemLine("이제 직업을 선택해 달라."), systemLine("입력 예시: " + PREFIX + "ㅈㅅ 해커")], [systemLine("직업 정보 보기: " + PREFIX + "ㅈㅂ 해커"), systemLine("직업 랜덤 고르기: " + PREFIX + "ㅈㅅㄹㄷ"), systemLine("직업 목록: " + PREFIX + "ㅈㅇ"), systemLine("현재 등록 직업 수는 " + ALL_JOBS.length + "개다.")]));
        }
        return;
      }

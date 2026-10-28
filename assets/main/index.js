System.register("chunks:///_virtual/AdRewards.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _extends, cclegacy;
  return {
    setters: [function (module) {
      _extends = module.extends;
    }, function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      exports({
        adGateFinish: adGateFinish,
        adGateStart: adGateStart,
        bonusPct: bonusPct,
        claimGift: claimGift,
        createAdGate: createAdGate,
        createGift: createGift,
        currencyAdReward: currencyAdReward,
        curvePrices: curvePrices,
        giftAvailable: giftAvailable,
        giftRemainingMs: giftRemainingMs,
        giftReward: giftReward,
        migrateGift: migrateGift,
        nextPrice: nextPrice,
        onRoundEnd: onRoundEnd,
        resultReward: resultReward,
        round5: round5
      });
      cclegacy._RF.push({}, "bcae6DyjHVKPIycsa8axrxd", "AdRewards", undefined);
      // @ts-nocheck
      // AdRewards.ts — the universal ad mechanism module (both boards; references/game-modules.md, user 2026-10-23).
      // COPY THIS FILE UNCHANGED into the game (audit_game_modules.py compares its SHA-256 with the skill's copy).
      // Plain JavaScript inside a .ts file: runs in Cocos 2.4 / 3.x and Node. Pure functions, no engine calls.
      // The numbers of every game come from two files only: unlock_table.json (B = normal_level_coins; coins_per_ad is already 5B; prices and bonuses)
      // and level_plan.json (coins of each level; bonus levels already pay 3x there).
      //
      // Game glue:
      //   result page:  r = resultReward(levelCoins, bonusPct(table, equippedIds)); show r.total and the "x2" ad button
      //                 (pays r.doubled instead of r.total; "No thanks" pays r.total). Every level end / every endless run end.
      //   home gift:    if (giftAvailable(gift)) show the 10-frame gift box; tap -> ad -> r = claimGift(gift, table.normal_level_coins, table, owned, cleared)
      //                 -> grant r.coins, save r.state. Persist wallet + nextClaimAt atomically after completion; display giftRemainingMs. Rounds do not refill gifts.
      //   ad buttons:   g = createAdGate(); on tap: token = adGateStart(g); if (!token) return; play the ad; on any callback:
      //                 if (adGateFinish(g, token, completed)) pay the reward once.

      var AD_REWARDS_VERSION = exports('AD_REWARDS_VERSION', 3);
      var RESULT_AD_MULTIPLIER = exports('RESULT_AD_MULTIPLIER', 2); // every level end / run end: watch an ad -> double
      var BONUS_LEVEL_MULTIPLIER = exports('BONUS_LEVEL_MULTIPLIER', 3); // bonus level coins in level_plan.json = 3x a normal level (x2 with the ad = 6x)
      var PRICE_STEPS = exports('PRICE_STEPS', [1, 4, 10, 20]); // price gap to the previous skin, in R: common, rare, epic, legendary
      var FIRST_PRICE_R = exports('FIRST_PRICE_R', 2); // legacy-2r only: first skin for sale costs 2R
      var GIFT_COOLDOWN_MS = exports('GIFT_COOLDOWN_MS', 30 * 60 * 1000);
      var CURRENCY_AD_MULTIPLIER = exports('CURRENCY_AD_MULTIPLIER', 5);
      var GIFT_MULTIPLIER = exports('GIFT_MULTIPLIER', 5);
      function isNum(v) {
        return typeof v === 'number' && isFinite(v);
      }
      function round5(x) {
        return Math.max(5, Math.round(x / 5) * 5);
      }
      function itemsOf(table) {
        return table && Array.isArray(table.items) ? table.items : Array.isArray(table) ? table : [];
      }

      // skin + background bonus of what is equipped (one of each), in percent
      function bonusPct(table, equippedIds) {
        var on = {};
        (equippedIds || []).forEach(function (id) {
          on[id] = true;
        });
        var pct = 0;
        var seen = {};
        itemsOf(table).forEach(function (it) {
          if (!on[it.id] || seen[it.group] || !it.bonus || it.bonus.type !== 'coins' || !isNum(it.bonus.pct)) return;
          seen[it.group] = true;
          pct += it.bonus.pct;
        });
        return pct;
      }

      // coins of one level end (or run end): bonus applied once, the ad doubles the total
      function resultReward(levelCoins, pct) {
        var base = Math.max(0, Math.round(levelCoins || 0));
        var total = Math.round(base * (1 + (pct || 0) / 100));
        return {
          base: base,
          skin_bonus: total - base,
          total: total,
          doubled: total * RESULT_AD_MULTIPLIER
        };
      }

      // the cheapest skin/background still for sale (coins), or the most expensive one when everything is owned
      function nextPrice(table, ownedIds) {
        var own = {};
        (ownedIds || []).forEach(function (id) {
          own[id] = true;
        });
        var priced = itemsOf(table).filter(function (it) {
          return it.unlock === 'coins' && isNum(it.coins) && it.coins > 0;
        });
        if (!priced.length) return 0;
        var left = priced.filter(function (it) {
          return !own[it.id];
        }).map(function (it) {
          return it.coins;
        });
        return left.length ? Math.min.apply(null, left) : Math.max.apply(null, priced.map(function (it) {
          return it.coins;
        }));
      }

      // B is ordinary base income, never the already-multiplied coins_per_ad.
      function baseCurrency(B) {
        if (!Number.isSafeInteger(B) || B <= 0 || !Number.isSafeInteger(50 * B)) throw new Error('positive safe integer ordinary base income required');
        return B;
      }
      function currencyAdReward(B) {
        return CURRENCY_AD_MULTIPLIER * baseCurrency(B);
      }
      function giftReward(B) {
        return GIFT_MULTIPLIER * baseCurrency(B);
      }
      function clock(now) {
        if (!Number.isSafeInteger(now) || now < 0) throw new Error('nonnegative millisecond clock required');
        return now;
      }
      function validGift(state) {
        return state && state.version === 3 && Number.isSafeInteger(state.nextClaimAt) && state.nextClaimAt >= 0 && Number.isSafeInteger(state.lastClaimAt) && state.lastClaimAt >= 0 && (state.nextClaimAt === 0 && state.lastClaimAt === 0 || state.nextClaimAt === state.lastClaimAt + GIFT_COOLDOWN_MS);
      }
      function createGift(now) {
        if (now === void 0) {
          now = Date.now();
        }
        clock(now);
        return {
          version: 3,
          nextClaimAt: 0,
          lastClaimAt: 0
        };
      }
      // Persist once on load. A spent legacy charge must not turn into a fresh claim.
      function migrateGift(state, now) {
        if (now === void 0) {
          now = Date.now();
        }
        clock(now);
        if (validGift(state)) return _extends({}, state);
        if (state && state.version === undefined && state.charges === 1) return createGift(now);
        return {
          version: 3,
          nextClaimAt: clock(now + GIFT_COOLDOWN_MS),
          lastClaimAt: now
        };
      }
      function giftRemainingMs(state, now) {
        if (now === void 0) {
          now = Date.now();
        }
        clock(now);
        return validGift(state) ? Math.max(0, state.nextClaimAt - Math.max(now, state.lastClaimAt)) : GIFT_COOLDOWN_MS;
      }
      function giftAvailable(state, now) {
        if (now === void 0) {
          now = Date.now();
        }
        return validGift(state) && giftRemainingMs(state, now) === 0;
      }
      function onRoundEnd(state) {
        return _extends({}, state);
      } // winning does not reset the 30-minute deadline
      function claimGift(state, B, table, ownedIds, cleared, now) {
        if (now === void 0) {
          now = Date.now();
        }
        clock(now);
        if (!giftAvailable(state, now)) return {
          coins: 0,
          state: _extends({}, state)
        };
        return {
          coins: giftReward(B),
          state: {
            version: 3,
            nextClaimAt: clock(now + GIFT_COOLDOWN_MS),
            lastClaimAt: now
          }
        };
      }

      // one ad at a time, one reward per ad: double taps and repeated callbacks do nothing
      function createAdGate() {
        return {
          busy: false,
          paid: 0,
          sequence: 0,
          active: null
        };
      }
      function adGateStart(g) {
        if (g.busy) return false;
        var token = Object.freeze({
          request: ++g.sequence
        });
        g.busy = true;
        g.active = token;
        return token;
      }
      function adGateFinish(g, token, completed) {
        if (!g.busy || !token || g.active !== token) return false;
        g.active = null;
        g.busy = false;
        if (completed !== true) return false;
        g.paid += 1;
        return true;
      }

      // New calls default to ordinary-levels. Pass the whole table to preserve its policy;
      // an existing table without price_profile keeps legacy-2r. Pass the saved table: its B is distinct from coins_per_ad.
      function curvePrices(R, rarities, pricing) {
        if (pricing === void 0) {
          pricing = 'ordinary-levels';
        }
        var config = typeof pricing === 'string' ? {
          price_profile: pricing
        } : pricing || {};
        var profile = config.price_profile || 'legacy-2r';
        if (profile !== 'ordinary-levels' && profile !== 'legacy-2r') throw new Error('unknown price_profile: ' + profile);
        if (profile === 'ordinary-levels') {
          var targets = config.price_level_targets || {
            common: 10,
            rare: 20,
            epic: 30,
            legendary: 40,
            limited: 50
          };
          var base = config.normal_level_coins === undefined ? config.coins_per_level === undefined ? R : config.coins_per_level : config.normal_level_coins;
          var values = ['common', 'rare', 'epic', 'legendary'].map(function (r) {
            return targets[r];
          });
          if (targets.limited !== undefined) values.push(targets.limited);
          if (config.economy_policy === 'normal-10-50.v1' && ['common', 'rare', 'epic', 'legendary', 'limited'].some(function (r, i) {
            return targets[r] !== 10 * (i + 1);
          })) throw new Error('current economy requires 10/20/30/40/50');
          if (!Number.isFinite(base) || base <= 0 || values.some(function (n, i) {
            return !Number.isFinite(n) || n <= 0 || i > 0 && n <= values[i - 1];
          })) throw new Error('positive ordinary income and increasing tier targets required');
          return rarities.map(function (r) {
            if (targets[r] === undefined) throw new Error('unknown rarity: ' + r);
            return Math.max(1, Math.round(base * targets[r]));
          });
        }
        var rank = {
          common: 0,
          rare: 1,
          epic: 2,
          legendary: 3
        };
        var out = [];
        rarities.forEach(function (r, i) {
          out.push(i === 0 ? FIRST_PRICE_R * R : out[i - 1] + PRICE_STEPS[rank[r]] * R);
        });
        return out;
      }
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameArt.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _construct, _asyncToGenerator, _regeneratorRuntime, cclegacy, SpriteFrame, Rect, Node, Layers, UITransform, Sprite, Texture2D, resources, ImageAsset, JsonAsset;
  return {
    setters: [function (module) {
      _construct = module.construct;
      _asyncToGenerator = module.asyncToGenerator;
      _regeneratorRuntime = module.regeneratorRuntime;
    }, function (module) {
      cclegacy = module.cclegacy;
      SpriteFrame = module.SpriteFrame;
      Rect = module.Rect;
      Node = module.Node;
      Layers = module.Layers;
      UITransform = module.UITransform;
      Sprite = module.Sprite;
      Texture2D = module.Texture2D;
      resources = module.resources;
      ImageAsset = module.ImageAsset;
      JsonAsset = module.JsonAsset;
    }],
    execute: function () {
      cclegacy._RF.push({}, "3e0eeqIAaJEEalAPVfwFVIC", "GameArt", undefined);
      var GameArt = exports('GameArt', /*#__PURE__*/function () {
        function GameArt() {
          this.textures = new Map();
          this.frames = new Map();
          this.regions = {
            logo: {
              sheet: 'sample',
              rect: [0, 25, 755, 780]
            },
            hero: {
              sheet: 'sample',
              rect: [755, 0, 525, 850]
            },
            PLAY: {
              sheet: 'sample',
              rect: [26, 850, 616, 336]
            }
          };
          this.missing = [];
        }
        var _proto = GameArt.prototype;
        _proto.init = /*#__PURE__*/function () {
          var _init = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
            var _this = this;
            var layout, optional;
            return _regeneratorRuntime().wrap(function _callee2$(_context2) {
              while (1) switch (_context2.prev = _context2.next) {
                case 0:
                  _context2.next = 2;
                  return new Promise(function (resolve, reject) {
                    return resources.load('art/layout', JsonAsset, function (e, a) {
                      return e ? reject(e) : resolve(a);
                    });
                  });
                case 2:
                  layout = _context2.sent;
                  this.regions = layout.json;
                  _context2.next = 6;
                  return Promise.all(['sample', 'buttons', 'pieces', 'background', 'extra', 'panel', 'titles', 'polish'].map(function (s) {
                    return _this.load(s);
                  }));
                case 6:
                  optional = ['skins', 'gardens', 'gift'];
                  this.missing = [];
                  _context2.next = 10;
                  return Promise.all(optional.map( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(s) {
                    return _regeneratorRuntime().wrap(function _callee$(_context) {
                      while (1) switch (_context.prev = _context.next) {
                        case 0:
                          _context.prev = 0;
                          _context.next = 3;
                          return _this.load(s);
                        case 3:
                          _context.next = 8;
                          break;
                        case 5:
                          _context.prev = 5;
                          _context.t0 = _context["catch"](0);
                          _this.missing.push(s);
                        case 8:
                        case "end":
                          return _context.stop();
                      }
                    }, _callee, null, [[0, 5]]);
                  }))));
                case 10:
                case "end":
                  return _context2.stop();
              }
            }, _callee2, this);
          }));
          function init() {
            return _init.apply(this, arguments);
          }
          return init;
        }();
        _proto.retryOptional = /*#__PURE__*/function () {
          var _retryOptional = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
            var _this2 = this;
            var missing;
            return _regeneratorRuntime().wrap(function _callee4$(_context4) {
              while (1) switch (_context4.prev = _context4.next) {
                case 0:
                  missing = [].concat(this.missing);
                  this.missing = [];
                  _context4.next = 4;
                  return Promise.all(missing.map( /*#__PURE__*/_asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(s) {
                    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
                      while (1) switch (_context3.prev = _context3.next) {
                        case 0:
                          _context3.prev = 0;
                          _context3.next = 3;
                          return _this2.load(s);
                        case 3:
                          _context3.next = 8;
                          break;
                        case 5:
                          _context3.prev = 5;
                          _context3.t0 = _context3["catch"](0);
                          _this2.missing.push(s);
                        case 8:
                        case "end":
                          return _context3.stop();
                      }
                    }, _callee3, null, [[0, 5]]);
                  }))));
                case 4:
                case "end":
                  return _context4.stop();
              }
            }, _callee4, this);
          }));
          function retryOptional() {
            return _retryOptional.apply(this, arguments);
          }
          return retryOptional;
        }();
        _proto.load = /*#__PURE__*/function () {
          var _load = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5(sheet) {
            var image, texture;
            return _regeneratorRuntime().wrap(function _callee5$(_context5) {
              while (1) switch (_context5.prev = _context5.next) {
                case 0:
                  if (!this.textures.has(sheet)) {
                    _context5.next = 2;
                    break;
                  }
                  return _context5.abrupt("return");
                case 2:
                  _context5.next = 4;
                  return new Promise(function (resolve, reject) {
                    return resources.load('art/' + sheet, ImageAsset, function (e, a) {
                      return e ? reject(e) : resolve(a);
                    });
                  });
                case 4:
                  image = _context5.sent;
                  texture = new Texture2D();
                  texture.image = image;
                  this.textures.set(sheet, texture);
                case 8:
                case "end":
                  return _context5.stop();
              }
            }, _callee5, this);
          }));
          function load(_x3) {
            return _load.apply(this, arguments);
          }
          return load;
        }();
        _proto.define = function define(key, sheet, rect) {
          this.regions[key] = {
            sheet: sheet,
            rect: rect
          };
        };
        _proto.has = function has(key) {
          return !!this.regions[key] && this.textures.has(this.regions[key].sheet);
        };
        _proto.frame = function frame(key) {
          if (this.frames.has(key)) return this.frames.get(key);
          var r = this.regions[key],
            texture = r && this.textures.get(r.sheet);
          if (!texture) return null;
          var f = new SpriteFrame();
          f.texture = texture;
          f.rect = _construct(Rect, r.rect);
          this.frames.set(key, f);
          return f;
        };
        _proto.add = function add(parent, key, x, y, width, height, mode) {
          if (mode === void 0) {
            mode = 'contain';
          }
          var frame = this.frame(key);
          if (!frame) return null;
          var node = new Node('Art:' + key);
          node.layer = Layers.Enum.UI_2D;
          parent.addChild(node);
          node.setPosition(x, y);
          node.addComponent(UITransform).setContentSize(width, height);
          var sprite = node.addComponent(Sprite);
          sprite.sizeMode = Sprite.SizeMode.CUSTOM;
          sprite.spriteFrame = frame;
          if (mode === 'panel') {
            frame.insetLeft = 140;
            frame.insetRight = 140;
            frame.insetTop = 140;
            frame.insetBottom = 140;
            sprite.type = Sprite.Type.SLICED;
          } else {
            var scale = mode === 'cover' ? Math.max(width / frame.rect.width, height / frame.rect.height) : Math.min(width / frame.rect.width, height / frame.rect.height);
            width = frame.rect.width * scale;
            height = frame.rect.height * scale;
          }
          var panelScale = mode === 'panel' ? Math.min(.25, height / 700) : 1;
          node.setScale(panelScale, panelScale, 1);
          node.getComponent(UITransform).setContentSize(width / panelScale, height / panelScale);
          return node;
        };
        return GameArt;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameAudioButton.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameAudioManager.ts'], function (exports) {
  var _applyDecoratedDescriptor, _inheritsLoose, _initializerDefineProperty, _assertThisInitialized, cclegacy, _decorator, Button, Component, GameAudioManager;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _inheritsLoose = module.inheritsLoose;
      _initializerDefineProperty = module.initializerDefineProperty;
      _assertThisInitialized = module.assertThisInitialized;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Button = module.Button;
      Component = module.Component;
    }, function (module) {
      GameAudioManager = module.GameAudioManager;
    }],
    execute: function () {
      var _dec, _class, _class2, _descriptor;
      cclegacy._RF.push({}, "e362asiFGZBer7CStsslIes", "GameAudioButton", undefined);
      var ccclass = _decorator.ccclass,
        property = _decorator.property;
      var GameAudioButton = exports('GameAudioButton', (_dec = ccclass('GameAudioButton'), _dec(_class = (_class2 = /*#__PURE__*/function (_Component) {
        _inheritsLoose(GameAudioButton, _Component);
        function GameAudioButton() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _initializerDefineProperty(_this, "soundId", _descriptor, _assertThisInitialized(_this));
          return _this;
        }
        var _proto = GameAudioButton.prototype;
        _proto.onEnable = function onEnable() {
          this.node.on(Button.EventType.CLICK, this.onClick, this);
        };
        _proto.onDisable = function onDisable() {
          this.node.off(Button.EventType.CLICK, this.onClick, this);
        };
        _proto.onClick = function onClick() {
          var btn = this.getComponent(Button);
          if (btn && !btn.interactable) return;
          var am = GameAudioManager.instance;
          if (!am) return;
          am.unlock();
          am.playSFX(this.soundId);
        };
        GameAudioButton.attachAll = function attachAll(root) {
          root.getComponentsInChildren(Button).forEach(function (btn) {
            if (btn.getComponent(GameAudioButton)) return;
            var bs = btn.addComponent(GameAudioButton);
            if (/back|close|cancel|返回|关闭/i.test(btn.node.name)) bs.soundId = 'sfx_ui_back';
          });
        };
        return GameAudioButton;
      }(Component), _descriptor = _applyDecoratedDescriptor(_class2.prototype, "soundId", [property], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 'sfx_ui_click';
        }
      }), _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameAudioConfig.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "a7debB62QFKnJwAL3LZSFuK", "GameAudioConfig", undefined); // ⚠️ 本文件由 process_audio.py 自动生成，不要手改。改音频请重新运行脚本。
      var BGM = exports('BGM', {
        bgm_game: {
          path: 'audio/bgm/bgm_gameplay',
          volume: 0.65
        },
        bgm_menu: {
          path: 'audio/bgm/bgm_home',
          volume: 0.65
        },
        jingle_lose: {
          path: 'audio/bgm/music_fail',
          volume: 0.8
        },
        jingle_win: {
          path: 'audio/bgm/music_win',
          volume: 0.8
        }
      });
      var SFX = exports('SFX', {
        sfx_ui_click: {
          path: 'audio/sfx/button',
          volume: 0.75
        },
        sfx_fail: {
          path: 'audio/sfx/fail',
          volume: 0.75
        },
        sfx_gate_delay: {
          path: 'audio/sfx/gate_delay',
          volume: 0.75
        },
        sfx_hint: {
          path: 'audio/sfx/hint',
          volume: 0.75
        },
        sfx_invalid: {
          path: 'audio/sfx/invalid',
          volume: 0.75
        },
        sfx_match: {
          path: 'audio/sfx/pair_clear',
          volume: 0.75
        },
        sfx_pot_bloom: {
          path: 'audio/sfx/pot_bloom',
          volume: 0.75
        },
        sfx_reward: {
          path: 'audio/sfx/reward',
          volume: 0.75
        },
        sfx_shuffle: {
          path: 'audio/sfx/shuffle',
          volume: 0.75
        },
        sfx_tile_slide: {
          path: 'audio/sfx/tile_slide',
          volume: 0.75
        },
        sfx_undo: {
          path: 'audio/sfx/undo',
          volume: 0.75
        }
      });
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameAudioManager.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameAudioConfig.ts'], function (exports) {
  var _inheritsLoose, _createClass, cclegacy, _decorator, Node, director, AudioSource, sys, game, Game, input, Input, Tween, resources, AudioClip, tween, Component, BGM, SFX;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _createClass = module.createClass;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Node = module.Node;
      director = module.director;
      AudioSource = module.AudioSource;
      sys = module.sys;
      game = module.game;
      Game = module.Game;
      input = module.input;
      Input = module.Input;
      Tween = module.Tween;
      resources = module.resources;
      AudioClip = module.AudioClip;
      tween = module.tween;
      Component = module.Component;
    }, function (module) {
      BGM = module.BGM;
      SFX = module.SFX;
    }],
    execute: function () {
      var _dec, _class, _class2;
      cclegacy._RF.push({}, "ce108YwjphMCqJbqHUmV4/v", "GameAudioManager", undefined);
      var ccclass = _decorator.ccclass;
      var KEY = 'ljj/audio/settings/v1';
      var BGM_BASE = 0.5; // BGM 一定要比音效小
      var SFX_BASE = 0.8;
      var JINGLE_BASE = 0.8; // 过关/失败短音乐属于"音乐"，跟音乐开关和音乐音量
      var SFX_MIN_INTERVAL = 50; // 同一音效两次播放最小间隔（毫秒）
      var SFX_MAX_CONCURRENT = 4; // 同时播放的音效上限
      var DUCK_LEVEL = 0.25; // 播放 jingle 时 BGM 压低到的比例

      // 可选音效没做时，自动用相近的音效代替，游戏代码可以放心调用标准 ID
      var FALLBACK = {
        sfx_ui_back: 'sfx_ui_click',
        sfx_ui_toggle: 'sfx_ui_click',
        sfx_ui_locked: 'sfx_invalid',
        sfx_ui_popup_close: 'sfx_ui_popup_open',
        sfx_ui_popup_open: 'sfx_ui_click',
        sfx_swap: 'sfx_select',
        sfx_hint: 'sfx_reward',
        sfx_shuffle: 'sfx_swap',
        sfx_booster: 'sfx_reward',
        sfx_clear_big: 'sfx_match',
        sfx_reward_ad: 'sfx_reward',
        sfx_unlock: 'sfx_reward',
        sfx_time_up: 'sfx_invalid',
        sfx_heart_lose: 'sfx_invalid',
        sfx_level_start: 'sfx_ui_popup_open',
        sfx_spin: 'sfx_coin',
        sfx_select: 'sfx_ui_click',
        sfx_place: 'sfx_select'
      };
      var GameAudioManager = exports('GameAudioManager', (_dec = ccclass('GameAudioManager'), _dec(_class = (_class2 = /*#__PURE__*/function (_Component) {
        _inheritsLoose(GameAudioManager, _Component);
        function GameAudioManager() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.bgmSource = void 0;
          _this.transients = [];
          _this.musicEpoch = 0;
          _this.jingleEpoch = 0;
          _this.sfxEpoch = 0;
          _this.alive = true;
          _this.saved = true;
          _this.loadedBgm = '';
          _this.clips = new Map();
          _this.lastPlayTime = new Map();
          _this.lastVariant = new Map();
          _this.activeSfx = 0;
          _this.currentBgm = '';
          _this.pendingBgm = '';
          _this.unlocked = false;
          _this.pauseReasons = new Set();
          _this.fade = {
            v: 0
          };
          _this.settings = {
            musicOn: true,
            sfxOn: true,
            musicLevel: 10,
            sfxLevel: 10,
            lastMusicLevel: 10,
            lastSFXLevel: 10
          };
          return _this;
        }
        /** 在启动场景调用一次；没有挂在场景里时会自动创建常驻节点 */
        GameAudioManager.init = function init() {
          if (GameAudioManager.instance) return GameAudioManager.instance;
          var node = new Node('GameAudioManager');
          director.getScene().addChild(node);
          return node.addComponent(GameAudioManager);
        };
        var _proto = GameAudioManager.prototype;
        _proto.onLoad = function onLoad() {
          if (GameAudioManager.instance && GameAudioManager.instance !== this) {
            this.node.destroy();
            return;
          }
          GameAudioManager.instance = this;
          director.addPersistRootNode(this.node);
          this.bgmSource = this.node.addComponent(AudioSource);
          this.bgmSource.loop = true;
          this.bgmSource.playOnAwake = false;
          this.loadSettings();

          // 浏览器要求第一次点击后才能出声；TikTok/原生环境可以直接播
          this.unlocked = !sys.isBrowser;
          game.on(Game.EVENT_HIDE, this.onHide, this);
          game.on(Game.EVENT_SHOW, this.onShow, this);
          input.once(Input.EventType.TOUCH_START, this.unlock, this);
        };
        _proto.onDestroy = function onDestroy() {
          this.alive = false;
          this.musicEpoch++;
          this.jingleEpoch++;
          this.sfxEpoch++;
          Tween.stopAllByTarget(this.fade);
          if (this.bgmSource) this.bgmSource.stop();
          this.stopTransients();
          if (GameAudioManager.instance === this) GameAudioManager.instance = undefined;
          game.off(Game.EVENT_HIDE, this.onHide, this);
          game.off(Game.EVENT_SHOW, this.onShow, this);
        }

        /** 玩家第一次点击屏幕时自动调用；按钮音组件也会调用，保证第一下就能出声 */;
        _proto.unlock = function unlock() {
          if (this.unlocked) return;
          this.unlocked = true;
          if (this.pendingBgm) {
            var id = this.pendingBgm;
            this.pendingBgm = '';
            this.playBGM(id);
          }
        }

        // ---------------------------------------------------------- 设置（开关 + 11 档音量，自动保存）
        ;

        _proto.loadSettings = function loadSettings() {
          try {
            var raw = sys.localStorage.getItem(KEY);
            if (raw) {
              var s = JSON.parse(raw);
              var music = this.clampLevel(s.musicLevel, 10),
                sfx = this.clampLevel(s.sfxLevel, 10);
              this.settings.lastMusicLevel = this.clampLevel(s.lastMusicLevel, music || 10) || music || 10;
              this.settings.lastSFXLevel = this.clampLevel(s.lastSFXLevel, sfx || 10) || sfx || 10;
              this.settings.musicOn = s.musicOn !== false && music > 0;
              this.settings.sfxOn = s.sfxOn !== false && sfx > 0;
              this.settings.musicLevel = this.settings.musicOn ? music : 0;
              this.settings.sfxLevel = this.settings.sfxOn ? sfx : 0;
            }
          } catch (e) {
            console.warn('[Audio] 设置读取失败，使用默认值', e);
          }
        };
        _proto.saveSettings = function saveSettings() {
          try {
            sys.localStorage.setItem(KEY, JSON.stringify(this.settings));
            this.saved = true;
            return true;
          } catch (e) {
            this.saved = false;
            console.warn('[Audio] 设置保存失败；当前设置仅本次运行有效，可重试保存', e);
            return false;
          }
        };
        _proto.clampLevel = function clampLevel(v, def) {
          var n = Math.round(Number(v));
          return isFinite(n) ? Math.max(0, Math.min(10, n)) : def;
        };
        _proto.retrySaveSettings = function retrySaveSettings() {
          return this.saveSettings();
        };
        _proto.setMusic = function setMusic(on) {
          this.settings.musicOn = !!on;
          this.settings.musicLevel = on ? this.settings.lastMusicLevel : 0;
          this.applyMusicSettings();
        };
        _proto.setSFX = function setSFX(on) {
          this.settings.sfxOn = !!on;
          this.settings.sfxLevel = on ? this.settings.lastSFXLevel : 0;
          this.applySFXSettings();
        }

        /** 绝对档位（点格）；正档开启，0 档静音并保留上次非零档。 */;
        _proto.setMusicLevel = function setMusicLevel(level) {
          var value = this.clampLevel(level, this.settings.musicLevel);
          this.settings.musicLevel = value;
          this.settings.musicOn = value > 0;
          if (value > 0) this.settings.lastMusicLevel = value;
          this.applyMusicSettings();
        };
        _proto.setSFXLevel = function setSFXLevel(level) {
          var value = this.clampLevel(level, this.settings.sfxLevel);
          this.settings.sfxLevel = value;
          this.settings.sfxOn = value > 0;
          if (value > 0) this.settings.lastSFXLevel = value;
          this.applySFXSettings();
        };
        _proto.increaseMusicLevel = function increaseMusicLevel() {
          this.setMusicLevel(this.musicLevel + 1);
        };
        _proto.decreaseMusicLevel = function decreaseMusicLevel() {
          this.setMusicLevel(this.musicLevel - 1);
        };
        _proto.increaseSFXLevel = function increaseSFXLevel() {
          this.setSFXLevel(this.sfxLevel + 1);
        };
        _proto.decreaseSFXLevel = function decreaseSFXLevel() {
          this.setSFXLevel(this.sfxLevel - 1);
        };
        _proto.applyMusicSettings = function applyMusicSettings() {
          this.saveSettings();
          this.musicEpoch++;
          Tween.stopAllByTarget(this.fade);
          this.refreshTransients('music');
          if (!this.musicScale()) {
            this.jingleEpoch++;
            this.bgmSource.volume = 0;
            this.bgmSource.stop();
            return;
          }
          if (this.pauseReasons.size) {
            this.currentBgm = this.currentBgm || this.pendingBgm || 'bgm_menu';
            return;
          }
          if (this.bgmSource.playing && this.loadedBgm === this.currentBgm) this.bgmSource.volume = this.bgmTarget(BGM[this.currentBgm]);else this.playBGM(this.currentBgm || this.pendingBgm || 'bgm_menu');
        };
        _proto.applySFXSettings = function applySFXSettings() {
          this.saveSettings();
          this.sfxEpoch++;
          this.refreshTransients('sfx');
        };
        _proto.musicScale = function musicScale() {
          return this.settings.musicOn ? this.settings.musicLevel / 10 : 0;
        };
        _proto.sfxScale = function sfxScale() {
          return this.settings.sfxOn ? this.settings.sfxLevel / 10 : 0;
        }

        // ---------------------------------------------------------- 加载
        ;

        _proto.pathsOf = function pathsOf(e) {
          if (e.variants && e.variants > 1) {
            var list = [];
            for (var i = 1; i <= e.variants; i++) list.push(e.path + "_" + i);
            return list;
          }
          return [e.path];
        }

        /** 预加载全部音效（体积小），BGM 只预加载 bgm_menu，其余用到再加载 */;
        _proto.preload = function preload(onDone) {
          var _this2 = this;
          var paths = [];
          Object.values(SFX).forEach(function (e) {
            return paths.push.apply(paths, _this2.pathsOf(e));
          });
          if (BGM['bgm_menu']) paths.push(BGM['bgm_menu'].path);
          if (!paths.length) {
            onDone && onDone();
            return;
          }
          resources.load(paths, AudioClip, function (err, list) {
            if (err) console.warn('[Audio] 预加载有失败项', err);
            (list || []).forEach(function (c, i) {
              return c && _this2.clips.set(paths[i], c);
            });
            onDone && onDone();
          });
        };
        _proto.getClip = function getClip(path, cb) {
          var _this3 = this;
          var cached = this.clips.get(path);
          if (cached) {
            cb(cached);
            return;
          }
          resources.load(path, AudioClip, function (err, clip) {
            if (err || !clip) {
              console.warn('[Audio] 加载失败', path);
              cb(null);
              return;
            }
            _this3.clips.set(path, clip);
            cb(clip);
          });
        }

        /** 多版本随机播放，且不连续两次播同一个版本 */;
        _proto.pickVariant = function pickVariant(id, e) {
          if (!e.variants || e.variants <= 1) return e.path;
          var i = 1 + Math.floor(Math.random() * e.variants);
          if (i === this.lastVariant.get(id)) i = i % e.variants + 1;
          this.lastVariant.set(id, i);
          return e.path + "_" + i;
        }

        // ---------------------------------------------------------- BGM
        ;

        _proto.playBGM = function playBGM(id, fadeIn) {
          var _this4 = this;
          if (fadeIn === void 0) {
            fadeIn = 0.5;
          }
          var e = BGM[id];
          if (!e) {
            console.warn('[Audio] 未知 BGM', id);
            return;
          }
          if (!this.unlocked) {
            this.pendingBgm = id;
            return;
          }
          var ticket = ++this.musicEpoch;
          this.jingleEpoch++;
          if (!this.musicScale() || this.pauseReasons.size) {
            this.currentBgm = id;
            return;
          }
          if (this.currentBgm === id && this.loadedBgm === id && this.bgmSource.playing) {
            this.fadeTo(this.bgmTarget(e), 0.3);
            return;
          }
          this.currentBgm = id;
          if (!this.settings.musicOn || this.pauseReasons.size) return;
          var start = function start() {
            return _this4.getClip(e.path, function (clip) {
              if (!clip || !_this4.alive || ticket !== _this4.musicEpoch || _this4.currentBgm !== id || !_this4.musicScale() || _this4.pauseReasons.size) return;
              _this4.bgmSource.stop();
              _this4.loadedBgm = id;
              _this4.bgmSource.clip = clip;
              _this4.bgmSource.loop = true;
              _this4.bgmSource.volume = 0;
              _this4.bgmSource.play();
              _this4.fadeTo(_this4.bgmTarget(e), fadeIn);
            });
          };
          // 有正在播的 BGM：先淡出再切，不会两首叠在一起
          if (this.bgmSource.playing) this.fadeTo(0, 0.3, start);else start();
        }

        /** 关卡 BGM 轮换：有 bgm_game_2 时奇偶关交替，减少听腻 */;
        _proto.playLevelBGM = function playLevelBGM(level) {
          var id = BGM['bgm_game_2'] && level % 2 === 0 ? 'bgm_game_2' : 'bgm_game';
          this.playBGM(BGM[id] ? id : 'bgm_menu');
        };
        _proto.stopBGM = function stopBGM(fadeOut) {
          var _this5 = this;
          if (fadeOut === void 0) {
            fadeOut = 0.3;
          }
          this.musicEpoch++;
          this.jingleEpoch++;
          this.currentBgm = '';
          this.pendingBgm = '';
          this.fadeTo(0, fadeOut, function () {
            return _this5.bgmSource.stop();
          });
        }

        /** 胜利 / 失败短音乐：BGM 压低，jingle 播到一半后 BGM 淡出停下；结算界面出现后再调用 playBGM('bgm_menu') */;
        _proto.playJingle = function playJingle(id) {
          var _this6 = this;
          var e = BGM[id];
          if (!e) {
            console.warn('[Audio] 未知 jingle', id);
            return;
          }
          if (!this.musicScale() || this.pauseReasons.size || !this.unlocked) return;
          var ticket = ++this.musicEpoch,
            jingleTicket = ++this.jingleEpoch;
          this.fadeTo(this.bgmTarget(BGM[this.currentBgm]) * DUCK_LEVEL, 0.15);
          this.getClip(e.path, function (clip) {
            var _e$volume;
            if (!clip || !_this6.alive || ticket !== _this6.musicEpoch || !_this6.musicScale() || _this6.pauseReasons.size) return;
            _this6.playTransient(clip, 'music', JINGLE_BASE * ((_e$volume = e.volume) != null ? _e$volume : 1), function () {
              _this6.scheduleOnce(function () {
                if (!_this6.alive || jingleTicket !== _this6.jingleEpoch || !_this6.musicScale() || _this6.pauseReasons.size) return;
                _this6.fadeTo(0, 0.4, function () {
                  _this6.bgmSource.stop();
                  _this6.currentBgm = '';
                });
              }, clip.getDuration() * 0.6);
            });
          });
        };
        _proto.bgmTarget = function bgmTarget(e) {
          var _e$volume2;
          return BGM_BASE * this.musicScale() * ((_e$volume2 = e == null ? void 0 : e.volume) != null ? _e$volume2 : 1);
        };
        _proto.fadeTo = function fadeTo(to, duration, done) {
          var _this7 = this;
          Tween.stopAllByTarget(this.fade);
          this.fade.v = this.bgmSource.volume;
          tween(this.fade).to(duration, {
            v: to
          }, {
            onUpdate: function onUpdate() {
              _this7.bgmSource.volume = _this7.musicScale() ? _this7.fade.v : 0;
            }
          }).call(function () {
            return done && done();
          }).start();
        }

        // playOneShot 无法停止；短音使用独立受控源，静音/暂停立即停止且不排队补播。
        ;

        _proto.removeTransient = function removeTransient(entry) {
          var index = this.transients.indexOf(entry);
          if (index < 0) return;
          entry.source.node.off(AudioSource.EventType.STARTED, entry.onStarted);
          entry.source.node.off(AudioSource.EventType.ENDED, entry.onEnded);
          entry.source.volume = 0;
          entry.source.stop();
          entry.source.clip = null;
          entry.source.destroy();
          this.unschedule(entry.cleanup);
          this.transients.splice(index, 1);
          if (entry.kind === 'sfx' && entry.started) this.activeSfx--;
        };
        _proto.stopTransients = function stopTransients(kind) {
          var _this8 = this;
          this.transients.slice().forEach(function (entry) {
            if (!kind || entry.kind === kind) _this8.removeTransient(entry);
          });
        };
        _proto.refreshTransients = function refreshTransients(kind) {
          var scale = kind === 'music' ? this.musicScale() : this.sfxScale();
          if (!scale) {
            this.stopTransients(kind);
            return;
          }
          this.transients.forEach(function (entry) {
            if (entry.kind === kind) entry.source.volume = entry.gain * scale;
          });
        };
        _proto.makeSFXRoom = function makeSFXRoom() {
          var slots = this.transients.filter(function (entry) {
            return entry.kind === 'sfx';
          });
          if (slots.length < SFX_MAX_CONCURRENT) return true;
          // AudioSource 公开 API 不区分内部加载失败与仍在加载；只在原预算满时替换旧未启动槽。
          var pending = slots.find(function (entry) {
            return !entry.started;
          });
          if (!pending) return false;
          this.removeTransient(pending);
          return true;
        };
        _proto.playTransient = function playTransient(clip, kind, gain, _onStarted) {
          var _this9 = this;
          var scale = kind === 'music' ? this.musicScale() : this.sfxScale();
          if (!this.alive || !scale || this.pauseReasons.size) return;
          if (kind === 'music') this.transients.slice().forEach(function (entry) {
            if (entry.kind === 'music' && !entry.started) _this9.removeTransient(entry);
          });
          var source = this.node.addComponent(AudioSource);
          source.playOnAwake = false;
          source.loop = false;
          source.clip = clip;
          source.volume = gain * scale;
          var entry = {
            source: source,
            kind: kind,
            gain: gain,
            started: false,
            // 解码/播放起点可能晚于资源回调；定时收尾不得截断仍在播放的短音。
            cleanup: function cleanup() {
              if (source.playing) {
                _this9.scheduleOnce(entry.cleanup, Math.max(clip.getDuration(), 0.1));
                return;
              }
              _this9.removeTransient(entry);
            },
            onStarted: function onStarted(started) {
              if (started !== source || entry.started || _this9.transients.indexOf(entry) < 0) return;
              entry.started = true;
              if (kind === 'sfx') _this9.activeSfx++;
              _this9.scheduleOnce(entry.cleanup, Math.max(clip.getDuration(), 0.1));
              if (_onStarted) _onStarted();
            },
            onEnded: function onEnded(ended) {
              if (ended === source) _this9.removeTransient(entry);
            }
          };
          source.node.on(AudioSource.EventType.STARTED, entry.onStarted);
          source.node.on(AudioSource.EventType.ENDED, entry.onEnded);
          this.transients.push(entry);
          source.play();
        }

        // ---------------------------------------------------------- 音效
        ;

        _proto.playSFX = function playSFX(id, volumeScale) {
          var _this$lastPlayTime$ge,
            _this10 = this;
          if (volumeScale === void 0) {
            volumeScale = 1;
          }
          if (!this.sfxScale() || !this.unlocked || this.pauseReasons.size) return;
          var ticket = this.sfxEpoch;
          var guard = 0;
          while (!SFX[id] && FALLBACK[id] && guard++ < 4) id = FALLBACK[id];
          var e = SFX[id];
          if (!e) {
            console.warn('[Audio] 未知音效', id);
            return;
          }
          var now = Date.now();
          if (now - ((_this$lastPlayTime$ge = this.lastPlayTime.get(id)) != null ? _this$lastPlayTime$ge : 0) < SFX_MIN_INTERVAL) return;
          if (!this.makeSFXRoom()) return;
          this.lastPlayTime.set(id, now);
          this.getClip(this.pickVariant(id, e), function (clip) {
            var _e$volume3;
            if (!clip || !_this10.alive || ticket !== _this10.sfxEpoch || !_this10.sfxScale() || _this10.pauseReasons.size || !_this10.makeSFXRoom()) return;
            _this10.playTransient(clip, 'sfx', SFX_BASE * ((_e$volume3 = e.volume) != null ? _e$volume3 : 1) * volumeScale);
          });
        }

        /** 连击：level 从 1 开始；超过最高级就一直用最高级 */;
        _proto.playCombo = function playCombo(level) {
          var max = 0;
          while (SFX["sfx_combo_" + (max + 1)]) max++;
          if (max === 0) {
            this.playSFX('sfx_match');
            return;
          }
          this.playSFX("sfx_combo_" + Math.min(Math.max(level, 1), max));
        }

        /** 结算星星：index 从 1 开始，跟着星星动画逐个调用 */;
        _proto.playStar = function playStar(index) {
          this.playSFX(SFX["sfx_star_" + index] ? "sfx_star_" + index : 'sfx_star_1');
        }

        /** 连续获得多个金币：依次播放，不叠在一起 */;
        _proto.playCoins = function playCoins(count) {
          var _this11 = this;
          var n = Math.min(count, 8),
            ticket = this.sfxEpoch;
          var _loop = function _loop(i) {
            _this11.scheduleOnce(function () {
              if (_this11.alive && ticket === _this11.sfxEpoch) _this11.playSFX('sfx_coin', 1 - i * 0.05);
            }, i * 0.06);
          };
          for (var i = 0; i < n; i++) {
            _loop(i);
          }
        }

        // ---------------------------------------------------------- 暂停（按原因记录）

        /** 激励视频播放前调用 pause('ad')，关闭后调用 resume('ad')；其他原因（如暂停菜单）自定名字 */;
        _proto.pause = function pause(reason) {
          if (this.pauseReasons.has(reason)) return;
          this.pauseReasons.add(reason);
          this.musicEpoch++;
          this.jingleEpoch++;
          this.sfxEpoch++;
          Tween.stopAllByTarget(this.fade);
          this.stopTransients();
          this.bgmSource.volume = 0; // 内部播放器迟到时，排队 PLAY/PAUSE 也必须保持零增益。
          this.bgmSource.pause();
        };
        _proto.resume = function resume(reason) {
          // Ordinary UI redraws may release an inactive reason; they must not replay BGM.
          if (!this.pauseReasons["delete"](reason)) return;
          if (this.pauseReasons.size) return;
          if (this.musicScale() && this.currentBgm && this.unlocked) {
            if (!this.bgmSource.clip || this.loadedBgm !== this.currentBgm) {
              var id = this.currentBgm;
              this.currentBgm = '';
              this.playBGM(id);
              return;
            }
            this.bgmSource.play();
            this.fadeTo(this.bgmTarget(BGM[this.currentBgm]), 0.3);
          }
        }

        /** 旧接口：等同 pause('ad') / resume('ad') */;
        _proto.pauseAll = function pauseAll() {
          this.pause('ad');
        };
        _proto.resumeAll = function resumeAll() {
          this.resume('ad');
        };
        _proto.onHide = function onHide() {
          this.pause('hide');
        };
        _proto.onShow = function onShow() {
          this.resume('hide');
        };
        _createClass(GameAudioManager, [{
          key: "settingsSaved",
          get: function get() {
            return this.saved;
          }
        }, {
          key: "musicOn",
          get: function get() {
            return this.settings.musicOn;
          }
        }, {
          key: "sfxOn",
          get: function get() {
            return this.settings.sfxOn;
          }
        }, {
          key: "musicLevel",
          get: function get() {
            return this.settings.musicLevel;
          } // 0–10，界面显示为 0%–100%
        }, {
          key: "sfxLevel",
          get: function get() {
            return this.settings.sfxLevel;
          }
        }]);
        return GameAudioManager;
      }(Component), _class2.instance = void 0, _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameDomain.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameRules.ts', './AdRewards.ts'], function (exports) {
  var _extends, _createClass, _asyncToGenerator, _regeneratorRuntime, _createForOfIteratorHelperLoose, cclegacy, initial, status, step, copy, actions, stateKey, nextFromLegal, slide, activeSuit, createGift, bonusPct, resultReward, giftAvailable, giftRemainingMs, claimGift;
  return {
    setters: [function (module) {
      _extends = module.extends;
      _createClass = module.createClass;
      _asyncToGenerator = module.asyncToGenerator;
      _regeneratorRuntime = module.regeneratorRuntime;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      initial = module.initial;
      status = module.status;
      step = module.step;
      copy = module.copy;
      actions = module.actions;
      stateKey = module.stateKey;
      nextFromLegal = module.nextFromLegal;
      slide = module.slide;
      activeSuit = module.activeSuit;
    }, function (module) {
      createGift = module.createGift;
      bonusPct = module.bonusPct;
      resultReward = module.resultReward;
      giftAvailable = module.giftAvailable;
      giftRemainingMs = module.giftRemainingMs;
      claimGift = module.claimGift;
    }],
    execute: function () {
      exports({
        freshSave: freshSave,
        readSave: readSave
      });
      cclegacy._RF.push({}, "faadd2QhlBKNYII57Wht43D", "GameDomain", undefined);
      var SAVE_KEY = exports('SAVE_KEY', 'ljj/progress/v1');
      var clone = exports('clone', function clone(v) {
        return JSON.parse(JSON.stringify(v));
      });
      var props = ['hint', 'undo', 'shuffle'];
      var safeInt = function safeInt(v, max) {
        if (max === void 0) {
          max = Number.MAX_SAFE_INTEGER;
        }
        return Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
      };
      function freshSave() {
        return {
          version: 2,
          revision: 0,
          dew: 0,
          cleared: [],
          stars: {},
          starter: {
            hint: 1,
            undo: 1,
            shuffle: 1
          },
          owned: {
            hint: 0,
            undo: 0,
            shuffle: 0
          },
          ownedIds: ['hero_01', 'bg_01'],
          hero: 'hero_01',
          background: 'bg_01',
          gift: createGift(),
          receipts: [],
          run: null,
          vibration: true,
          reducedMotion: false,
          growth: []
        };
      }
      function readSave(raw) {
        if (raw === null || raw === undefined || raw === '') return freshSave();
        // Boolean storage values are corrupt for this JSON-document key, never a new save.
        if (typeof raw !== 'string') throw new Error('Saved progress could not be read. Original data is kept.');
        var data = JSON.parse(raw);
        if (!data || !safeInt(data.dew) || !Array.isArray(data.cleared) || data.cleared.some(function (v) {
          return !safeInt(v, 70) || !v;
        }) || new Set(data.cleared).size !== data.cleared.length || !data.starter || props.some(function (k) {
          return !safeInt(data.starter[k], 1);
        })) throw new Error('Saved progress is damaged. Original data is kept.');
        if (data.version === 1) {
          var n = freshSave();
          n.dew = data.dew;
          n.cleared = data.cleared;
          n.starter = _extends({}, data.starter);
          data.cleared.forEach(function (v) {
            return n.stars[v] = 1;
          });
          return n;
        }
        if (data.version !== 2 || !safeInt(data.revision) || !data.owned || props.some(function (k) {
          return !safeInt(data.owned[k]);
        }) || !Array.isArray(data.ownedIds) || data.ownedIds.some(function (id) {
          return typeof id !== 'string';
        }) || !Array.isArray(data.receipts) || data.receipts.some(function (id) {
          return typeof id !== 'string';
        }) || !data.ownedIds.includes(data.hero) || !data.ownedIds.includes(data.background) || typeof data.vibration !== 'boolean' || typeof data.reducedMotion !== 'boolean' || !Array.isArray(data.growth) || typeof data.stars !== 'object' || Object.values(data.stars).some(function (v) {
          return !safeInt(v, 3);
        })) throw new Error('Saved progress is damaged. Original data is kept.');
        if (!data.gift || data.gift.version !== 3 || !safeInt(data.gift.nextClaimAt) || !safeInt(data.gift.lastClaimAt) || !(data.gift.lastClaimAt === 0 && data.gift.nextClaimAt === 0 || data.gift.nextClaimAt === data.gift.lastClaimAt + 1800000)) throw new Error('Gift progress could not be read. Original data is kept.');
        if (data.run) {
          var r = data.run;
          if (typeof r.id !== 'string' || !safeInt(r.level, 70) || r.level < 1 || !safeInt(r.moves) || !safeInt(r.helps) || !Array.isArray(r.history) || r.history.length > 60 || !r.history.length || !r.state || !Array.isArray(r.state.board) || !r.adCounts || props.some(function (k) {
            return !safeInt(r.adCounts[k], 2);
          }) || typeof r.basePaid !== 'boolean' || typeof r.doublePaid !== 'boolean') throw new Error('Saved run could not be read. Original data is kept.');
          var _n = r.state.board.length;
          if (_n < 5 || _n > 7 || r.state.board.some(function (row) {
            return !Array.isArray(row) || row.length !== _n || row.some(function (v) {
              return !safeInt(v, 8);
            });
          }) || !Array.isArray(r.state.counts) || r.state.counts.length !== 3 || r.state.counts.some(function (v) {
            return !safeInt(v, 30);
          }) || !Array.isArray(r.state.gate) || r.state.gate.length !== 3 || [1, 2, 3].some(function (v) {
            return !r.state.gate.includes(v);
          }) || !safeInt(r.state.delay, 3) || !safeInt(r.state.ink, 100)) throw new Error('Saved board could not be read. Original data is kept.');
          if (typeof r.revived !== 'boolean' || !safeInt(r.stars, 3) || r.history.some(function (v) {
            return !v || !Array.isArray(v.board) || v.board.length !== _n || v.board.some(function (row) {
              return !Array.isArray(row) || row.length !== _n || row.some(function (x) {
                return !safeInt(x, 8);
              });
            }) || !Array.isArray(v.counts) || v.counts.length !== 3 || v.counts.some(function (x) {
              return !safeInt(x, 30);
            }) || !Array.isArray(v.gate) || v.gate.length !== 3 || [1, 2, 3].some(function (x) {
              return !v.gate.includes(x);
            }) || !safeInt(v.delay, 3) || !safeInt(v.ink, 100);
          })) throw new Error('Saved history could not be read. Original data is kept.');
          if (r.result && (!safeInt(r.result.total) || r.result.doubled !== 2 * r.result.total || !safeInt(r.stars, 3))) throw new Error('Saved result could not be read.');
          if (r.hint != null && (!Array.isArray(r.hint) || r.hint.length !== 5 || !safeInt(r.hint[0], _n - 1) || !safeInt(r.hint[1], _n - 1) || !['up', 'down', 'left', 'right'].includes(r.hint[2]) || !safeInt(r.hint[3], _n) || r.hint[3] < 1 || !safeInt(r.hint[4], 2 * _n))) throw new Error('Saved hint could not be read. Original data is kept.');
        }
        return data;
      }
      // A drag has no separate pair picker: only the first action for its gesture can occur.
      function playableActions(state, mechanics) {
        var seen = new Set();
        return actions(state, mechanics).filter(function (a) {
          var key = JSON.stringify(a.slice(0, 4));
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      var GameDomain = exports('GameDomain', /*#__PURE__*/function () {
        function GameDomain(levels, table, storage, shuffleOrder) {
          var _this$run,
            _this = this;
          this.save = void 0;
          this.pending = null;
          this.lastError = '';
          this.searchEpoch = 0;
          this.levels = levels;
          this.table = table;
          this.storage = storage;
          this.shuffleOrder = shuffleOrder;
          var raw = storage.read();
          this.save = readSave(raw);
          // Reject unknown collection IDs instead of silently stripping purchased items.
          if (this.save.ownedIds.some(function (id) {
            return !table.items.some(function (i) {
              return i.id === id;
            });
          })) throw new Error('Collection data is unavailable. Please retry.');
          // Relax existing unfinished learning runs without resetting their board or inventory.
          if (this.run && !this.run.result && this.run.level <= 12) {
            var next = clone(this.save),
              r = next.run,
              m = this.level.mechanics;
            for (var _i = 0, _arr = [r.state].concat(r.history); _i < _arr.length; _i++) {
              var state = _arr[_i];
              if (!m.includes('F1')) state.delay = 0;
              if (!m.includes('F3')) state.ink = 0;
            }
            if (JSON.stringify(next) !== JSON.stringify(this.save) && !this.write(next)) throw new Error(this.lastError);
          }
          // Credit only the increase in the level budget to unfinished legacy runs, once.
          if (this.run && !this.run.result && this.level.mechanics.includes('F3')) {
            var _ref, _this$run$inkBudget;
            var previous = (_ref = (_this$run$inkBudget = this.run.inkBudget) != null ? _this$run$inkBudget : this.level.legacyInk) != null ? _ref : this.level.state.ink;
            if (!safeInt(previous, 100)) throw new Error('Saved ink budget could not be verified.');
            if (previous !== this.level.state.ink) {
              var _next = clone(this.save),
                _r = _next.run,
                delta = Math.max(0, this.level.state.ink - previous);
              for (var _i2 = 0, _arr2 = [_r.state].concat(_r.history); _i2 < _arr2.length; _i2++) {
                var _state = _arr2[_i2];
                _state.ink += delta;
              }
              _r.inkBudget = this.level.state.ink;
              if (!this.write(_next)) throw new Error(this.lastError);
            }
          }
          if (!(typeof raw === 'string' && raw && JSON.parse(raw).version === 2) && !this.write(this.save)) throw new Error(this.lastError);
          if (this.run && (this.run.history.length > 60 || stateKey(this.run.state) !== stateKey(this.run.history[this.run.history.length - 1]) || this.run.result && status(this.run.state, this.level.mechanics) !== 'won')) throw new Error('Saved run could not be verified. Original data is kept.');
          if ((_this$run = this.run) != null && _this$run.hint && !actions(this.run.state, this.level.mechanics).some(function (a) {
            return JSON.stringify(a) === JSON.stringify(_this.run.hint);
          })) throw new Error('Saved hint could not be verified. Original data is kept.');
        }
        var _proto = GameDomain.prototype;
        _proto.write = function write(next) {
          try {
            next.revision = this.save.revision + 1;
            this.storage.write(JSON.stringify(next));
            this.save = next;
            this.pending = null;
            this.lastError = '';
            return true;
          } catch (_unused) {
            this.pending = clone(next);
            this.lastError = 'Could not save. Your reward is waiting. Retry saving.';
            return false;
          }
        };
        _proto.transaction = function transaction(change) {
          if (this.pending) return false;
          var n = clone(this.save);
          if (change(n) === false) return false;
          return this.write(n);
        };
        _proto.retrySave = function retrySave() {
          return this.pending ? this.write(clone(this.pending)) : true;
        };
        _proto.abandonSearch = function abandonSearch() {
          this.searchEpoch++;
        };
        _proto.start = function start(level) {
          if (level < 1 || level > this.nextLevel) return false;
          this.abandonSearch();
          var l = this.levels[level - 1];
          return this.transaction(function (s) {
            s.run = {
              id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10),
              level: level,
              inkBudget: l.state.ink,
              state: initial(l),
              history: [initial(l)],
              moves: 0,
              helps: 0,
              revived: false,
              adCounts: {
                hint: 0,
                undo: 0,
                shuffle: 0
              },
              result: null,
              basePaid: false,
              doublePaid: false,
              stars: 0,
              hint: null
            };
          });
        };
        _proto.recordMove = function recordMove(action) {
          var _this2 = this;
          if (!this.run || this.run.result || status(this.run.state, this.level.mechanics) !== 'ready') return false;
          var next = step(this.run.state, action, this.level.mechanics);
          this.abandonSearch();
          return this.transaction(function (s) {
            var r = s.run;
            r.state = next;
            r.hint = null;
            r.history.push(copy(next));
            r.moves++;
            if (status(next, _this2.level.mechanics) === 'won') {
              var _baseCoins, _payoutCoins;
              // The supplied custom contract makes backgrounds cosmetic; only the equipped Luna earns the bonus.
              var pct = bonusPct(_this2.table, [s.hero]);
              var plan = s.cleared.includes(_this2.level.id) ? (_baseCoins = _this2.level.baseCoins) != null ? _baseCoins : _this2.level.coins : (_payoutCoins = _this2.level.payoutCoins) != null ? _payoutCoins : _this2.level.coins;
              r.stars = r.helps === 0 && r.state.delay === 0 ? 3 : r.helps <= 2 ? 2 : 1;
              var perfect = r.stars === 3 ? Math.round(_this2.table.normal_level_coins * 0.1) : 0;
              r.result = resultReward(plan + perfect, pct);
            }
          });
        };
        _proto.claimBase = function claimBase() {
          var _this$run2,
            _this3 = this;
          if (!((_this$run2 = this.run) != null && _this$run2.result)) return false;
          var id = this.run.id;
          return this.transaction(function (s) {
            var r = s.run;
            if (r.id !== id || !r.result) return false;
            if (r.basePaid) return true;
            _this3.credit(s, 'base:' + id, r.result.total);
            r.basePaid = true;
            if (!s.cleared.includes(r.level)) s.cleared.push(r.level);
            s.stars[r.level] = Math.max(s.stars[r.level] || 0, r.stars);
            if (r.level === 70 && !s.ownedIds.includes('hero_limited')) s.ownedIds.push('hero_limited');
          });
        };
        _proto.credit = function credit(s, id, amount) {
          if (s.receipts.includes(id)) return false;
          if (!safeInt(amount) || !safeInt(s.dew + amount)) throw new Error('Invalid reward');
          s.dew += amount;
          s.receipts.push(id);
          s.receipts = s.receipts.slice(-512);
          return true;
        };
        _proto.doubleResult = function doubleResult(id) {
          var _this4 = this;
          return this.transaction(function (s) {
            var r = s.run;
            if (!r || r.id !== id || !r.result || !r.basePaid || r.doublePaid) return false;
            _this4.credit(s, 'double:' + id, r.result.total);
            r.doublePaid = true;
          });
        };
        _proto.giftAvailable = function giftAvailable$1(now) {
          if (now === void 0) {
            now = Date.now();
          }
          return giftAvailable(this.save.gift, now);
        };
        _proto.giftRemaining = function giftRemaining(now) {
          if (now === void 0) {
            now = Date.now();
          }
          return giftRemainingMs(this.save.gift, now);
        };
        _proto.claimGift = function claimGift$1(_double, now) {
          var _this5 = this;
          if (_double === void 0) {
            _double = false;
          }
          if (now === void 0) {
            now = Date.now();
          }
          if (!this.giftAvailable(now)) return false;
          return this.transaction(function (s) {
            var result = claimGift(s.gift, _this5.table.normal_level_coins, _this5.table, s.ownedIds, s.cleared.length, now);
            if (!result.coins) return false;
            var id = 'gift:' + s.gift.nextClaimAt + ':' + s.gift.lastClaimAt;
            _this5.credit(s, id, _double ? resultReward(result.coins, 0).doubled : result.coins);
            s.gift = result.state;
          });
        };
        _proto.buyLook = function buyLook(id) {
          var item = this.table.items.find(function (i) {
            return i.id === id;
          });
          if (!item) return false;
          return this.transaction(function (s) {
            if (s.ownedIds.includes(id)) return false;
            if (item.unlock === 'free') {
              s.ownedIds.push(id);
              return;
            }
            if (!item.coins || s.dew < item.coins) return false;
            s.dew -= item.coins;
            s.ownedIds.push(id);
          });
        };
        _proto.equip = function equip(id) {
          var item = this.table.items.find(function (i) {
            return i.id === id;
          });
          if (!item || !this.save.ownedIds.includes(id)) return false;
          return this.transaction(function (s) {
            if (item.group === 'skin') s.hero = id;else s.background = id;
          });
        };
        _proto.buyProp = function buyProp(prop) {
          var price = this.table.props[prop].coins;
          return this.transaction(function (s) {
            if (s.dew < price) return false;
            s.dew -= price;
            s.owned[prop]++;
          });
        };
        _proto.stock = function stock(prop) {
          return this.save.starter[prop] + this.save.owned[prop];
        };
        _proto.unlocked = function unlocked(prop) {
          var _this$run3;
          return (((_this$run3 = this.run) == null ? void 0 : _this$run3.level) || this.nextLevel) >= this.table.props[prop].unlock_level;
        };
        _proto.charge = function charge(s, prop) {
          if (s.starter[prop] > 0) s.starter[prop]--;else if (s.owned[prop] > 0) s.owned[prop]--;else return false;
          return true;
        };
        _proto.hintShown = function hintShown(action) {
          var _this$run4,
            _this6 = this;
          if ((_this$run4 = this.run) != null && _this$run4.hint) return JSON.stringify(this.run.hint) === JSON.stringify(action);
          if (!this.run || !this.stock('hint') || !actions(this.run.state, this.level.mechanics).some(function (a) {
            return JSON.stringify(a) === JSON.stringify(action);
          })) return false;
          return this.transaction(function (s) {
            if (!_this6.charge(s, 'hint')) return false;
            s.run.hint = action.slice();
            s.run.helps++;
          });
        };
        _proto.undo = function undo() {
          var _this7 = this;
          if (!this.run || !this.unlocked('undo') || this.run.history.length < 2 || this.run.result) return false;
          this.abandonSearch();
          return this.transaction(function (s) {
            if (!_this7.charge(s, 'undo')) return false;
            var r = s.run;
            r.history.pop();
            r.hint = null;
            r.state = copy(r.history[r.history.length - 1]);
            r.helps++;
          });
        };
        _proto.learningUndo = function learningUndo() {
          if (!this.run || this.run.level > 8 || this.run.result || this.run.history.length < 2) return false;
          this.abandonSearch();
          return this.transaction(function (s) {
            var r = s.run;
            r.history.pop();
            r.state = copy(r.history[r.history.length - 1]);
            r.hint = null;
            r.helps++;
          });
        };
        _proto.shuffledState = function shuffledState() {
          if (!this.run) return null;
          var ns = copy(this.run.state),
            values = ns.board.flat().filter(Boolean),
            order = this.shuffleOrder[String(values.length)];
          if (values.length < 4 || !order) return null;
          values.sort(function (a, b) {
            return order.indexOf(a) - order.indexOf(b);
          });
          var i = 0;
          ns.board = ns.board.map(function (row) {
            return row.map(function (v) {
              return v ? values[i++] : 0;
            });
          });
          return stateKey(ns) === stateKey(this.run.state) ? null : ns;
        };
        _proto.shuffleCandidates = function shuffleCandidates() {
          if (!this.run) return [];
          var out = [],
            first = this.shuffledState();
          if (first) out.push(first);
          var s = this.run.state,
            cells = [];
          s.board.forEach(function (row, r) {
            return row.forEach(function (v, c) {
              if (v) cells.push([r, c]);
            });
          });
          for (var i = 0; i < cells.length && out.length < 40; i++) for (var j = i + 1; j < cells.length && out.length < 40; j++) {
            var _cells$i = cells[i],
              r = _cells$i[0],
              c = _cells$i[1],
              _cells$j = cells[j],
              rr = _cells$j[0],
              cc = _cells$j[1];
            if (s.board[r][c] === s.board[rr][cc]) continue;
            var n = copy(s);
            var _ref2 = [n.board[rr][cc], n.board[r][c]];
            n.board[r][c] = _ref2[0];
            n.board[rr][cc] = _ref2[1];
            out.push(n);
          }
          return out;
        };
        _proto.applyShuffle = function applyShuffle(ns) {
          var _this8 = this;
          if (!this.run || !this.unlocked('shuffle') || !this.stock('shuffle')) return false;
          if (!this.shuffleCandidates().some(function (s) {
            return stateKey(s) === stateKey(ns);
          })) return false;
          this.abandonSearch();
          return this.transaction(function (s) {
            if (!_this8.charge(s, 'shuffle')) return false;
            s.run.state = copy(ns);
            s.run.hint = null;
            s.run.history.push(copy(ns));
            s.run.helps++;
          });
        };
        _proto.grantPropAd = function grantPropAd(prop, runId) {
          return this.transaction(function (s) {
            var r = s.run;
            if (!r || r.id !== runId || r.adCounts[prop] >= 2) return false;
            r.adCounts[prop]++;
            s.owned[prop]++;
          });
        };
        _proto.revive = function revive(runId) {
          if (!this.run || this.run.id !== runId || this.run.revived || this.run.history.length < 2 || this.run.result) return false;
          this.abandonSearch();
          return this.transaction(function (s) {
            var r = s.run;
            r.hint = null;
            r.history = r.history.slice(0, Math.max(1, r.history.length - 2));
            r.state = copy(r.history[r.history.length - 1]);
            r.revived = true;
            r.helps++;
          });
        };
        _proto.solve = /*#__PURE__*/function () {
          var _solve = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(state, limitMs) {
            var _this9 = this;
            var epoch, mechanics, s, witness, i, q, reachable, _loop, _iterator, _step, deadline, seen, nodes, dfs;
            return _regeneratorRuntime().wrap(function _callee2$(_context3) {
              while (1) switch (_context3.prev = _context3.next) {
                case 0:
                  if (limitMs === void 0) {
                    limitMs = 2200;
                  }
                  epoch = ++this.searchEpoch, mechanics = this.level.mechanics; // Reuse a delivered proof only when the entire future state is exactly equal.
                  s = initial(this.level);
                  witness = this.level.solution || [];
                  i = 0;
                case 5:
                  if (!(i < witness.length)) {
                    _context3.next = 23;
                    break;
                  }
                  if (!(stateKey(s) === stateKey(state))) {
                    _context3.next = 19;
                    break;
                  }
                  q = copy(state), reachable = true;
                  _loop = /*#__PURE__*/_regeneratorRuntime().mark(function _loop() {
                    var a, actual;
                    return _regeneratorRuntime().wrap(function _loop$(_context) {
                      while (1) switch (_context.prev = _context.next) {
                        case 0:
                          a = _step.value;
                          actual = playableActions(q, mechanics).find(function (x) {
                            return JSON.stringify(x.slice(0, 4)) === JSON.stringify(a.slice(0, 4));
                          });
                          if (!(!actual || JSON.stringify(actual) !== JSON.stringify(a))) {
                            _context.next = 5;
                            break;
                          }
                          reachable = false;
                          return _context.abrupt("return", 1);
                        case 5:
                          q = nextFromLegal(q, actual, mechanics);
                        case 6:
                        case "end":
                          return _context.stop();
                      }
                    }, _loop);
                  });
                  _iterator = _createForOfIteratorHelperLoose(witness.slice(i));
                case 10:
                  if ((_step = _iterator()).done) {
                    _context3.next = 16;
                    break;
                  }
                  return _context3.delegateYield(_loop(), "t0", 12);
                case 12:
                  if (!_context3.t0) {
                    _context3.next = 14;
                    break;
                  }
                  return _context3.abrupt("break", 16);
                case 14:
                  _context3.next = 10;
                  break;
                case 16:
                  if (!reachable) {
                    _context3.next = 18;
                    break;
                  }
                  return _context3.abrupt("return", witness.slice(i));
                case 18:
                  return _context3.abrupt("break", 23);
                case 19:
                  s = step(s, witness[i], mechanics);
                case 20:
                  i++;
                  _context3.next = 5;
                  break;
                case 23:
                  deadline = Date.now() + limitMs, seen = new Set();
                  nodes = 0;
                  dfs = /*#__PURE__*/function () {
                    var _ref3 = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(s, path) {
                      var key, legal, _iterator2, _step2, _step2$value, a, next, found;
                      return _regeneratorRuntime().wrap(function _callee$(_context2) {
                        while (1) switch (_context2.prev = _context2.next) {
                          case 0:
                            if (!(_this9.searchEpoch !== epoch || Date.now() > deadline || nodes++ > 6000)) {
                              _context2.next = 2;
                              break;
                            }
                            return _context2.abrupt("return", null);
                          case 2:
                            if (s.board.some(function (row) {
                              return row.some(Boolean);
                            })) {
                              _context2.next = 4;
                              break;
                            }
                            return _context2.abrupt("return", path);
                          case 4:
                            key = stateKey(s);
                            if (!seen.has(key)) {
                              _context2.next = 7;
                              break;
                            }
                            return _context2.abrupt("return", null);
                          case 7:
                            seen.add(key);
                            if (!(nodes % 8 === 0)) {
                              _context2.next = 11;
                              break;
                            }
                            _context2.next = 11;
                            return new Promise(function (resolve) {
                              return setTimeout(resolve, 0);
                            });
                          case 11:
                            legal = playableActions(s, mechanics).map(function (a) {
                              var q = slide(s.board, a[0], a[1], a[2], a[3]),
                                t = q.board[q.r][q.c];
                              return {
                                a: a,
                                score: mechanics.includes('F1') && t <= 3 ? t === activeSuit(s) ? 0 : 2 : 1,
                                next: nextFromLegal(s, a, mechanics)
                              };
                            }).sort(function (a, b) {
                              return a.score - b.score;
                            });
                            _iterator2 = _createForOfIteratorHelperLoose(legal);
                          case 13:
                            if ((_step2 = _iterator2()).done) {
                              _context2.next = 24;
                              break;
                            }
                            _step2$value = _step2.value, a = _step2$value.a, next = _step2$value.next;
                            _context2.next = 17;
                            return dfs(next, [].concat(path, [a]));
                          case 17:
                            found = _context2.sent;
                            if (!found) {
                              _context2.next = 20;
                              break;
                            }
                            return _context2.abrupt("return", found);
                          case 20:
                            if (!(_this9.searchEpoch !== epoch || Date.now() > deadline)) {
                              _context2.next = 22;
                              break;
                            }
                            return _context2.abrupt("return", null);
                          case 22:
                            _context2.next = 13;
                            break;
                          case 24:
                            return _context2.abrupt("return", null);
                          case 25:
                          case "end":
                            return _context2.stop();
                        }
                      }, _callee);
                    }));
                    return function dfs(_x3, _x4) {
                      return _ref3.apply(this, arguments);
                    };
                  }();
                  return _context3.abrupt("return", dfs(copy(state), []));
                case 27:
                case "end":
                  return _context3.stop();
              }
            }, _callee2, this);
          }));
          function solve(_x, _x2) {
            return _solve.apply(this, arguments);
          }
          return solve;
        }();
        _createClass(GameDomain, [{
          key: "run",
          get: function get() {
            return this.save.run;
          }
        }, {
          key: "level",
          get: function get() {
            var _this10 = this;
            return this.levels.find(function (l) {
              var _this10$run;
              return l.id === ((_this10$run = _this10.run) == null ? void 0 : _this10$run.level);
            });
          }
        }, {
          key: "nextLevel",
          get: function get() {
            var n = 1;
            while (this.save.cleared.includes(n) && n < this.levels.length) n++;
            return n;
          }
        }]);
        return GameDomain;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameplayFeedback.ts", ['cc', './GameRules.ts'], function (exports) {
  var cclegacy, activeSuit, slide, candidates, actions;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      activeSuit = module.activeSuit;
      slide = module.slide;
      candidates = module.candidates;
      actions = module.actions;
    }],
    execute: function () {
      exports({
        failureFeedback: failureFeedback,
        failureReason: failureReason,
        gateCaption: gateCaption,
        moveFeedback: moveFeedback,
        openingFeedback: openingFeedback,
        rejectedSlide: rejectedSlide
      });
      cclegacy._RF.push({}, "9c6d1DcfFNJ77hcsno5g4qP", "GameplayFeedback", undefined);
      var TILE_NAMES = exports('TILE_NAMES', ['', 'Pink flower', 'Yellow flower', 'Purple flower', 'Leaf', 'Crescent', 'Star', 'Cloud', 'Jade knot']);
      function gateCaption(s) {
        var suit = activeSuit(s);
        return suit ? "Match " + TILE_NAMES[suit] : 'Flower order complete';
      }
      function openingFeedback(l, s) {
        if (l.id === 15 && !l.mechanics.includes('F1')) return 'Bonus garden: match any pair. Flower blooms still settle tiles.';
        if (l.id === 13) return 'Ink: 1 per pair; wrong flower costs 3.\nA flower’s third pair restores 1 ink.';
        if (l.id === 6) return 'A flower’s third pair makes all tiles fall downward.';
        if (l.mechanics.includes('F1')) return gateCaption(s) + ". Other flowers: +1 mistake.";
        return l.id <= 8 ? 'Match any identical pair. Undo is free.' : 'Slide to line up two identical tiles.';
      }
      function moveFeedback(old, next, m) {
        var pairs = next.board.flat().filter(Boolean).length / 2;
        if (!pairs) return 'Garden cleared!';
        var ink = m.includes('F3') ? "\nInk " + next.ink + " \xB7 " + pairs + " pairs left" : '';
        if (next.delay > old.delay) {
          var refund = m.includes('F2') && next.counts.some(function (v, i) {
            return v === 3 && old.counts[i] < 3;
          });
          return "Wrong flower: mistake " + next.delay + "/3" + (m.includes('F3') ? ' · -1 base -2 penalty' + (refund ? ' +1 bloom' : '') : '') + "." + ink;
        }
        if (m.includes('F2') && next.counts.some(function (v, i) {
          return v === 3 && old.counts[i] < 3;
        })) {
          var suit = activeSuit(next),
            changed = m.includes('F1') && activeSuit(old) !== suit;
          return (changed && suit ? "Flower complete! Next: " + TILE_NAMES[suit] + "." : 'Flower complete: tiles fall.') + (m.includes('F3') ? ' +1 ink.' : '') + ink;
        }
        if (m.includes('F1') && activeSuit(old) !== activeSuit(next)) return 'Next: ' + gateCaption(next) + '.' + ink;
        if (m.includes('F3')) return 'Pair cleared.' + ink;
        if (m.includes('F1')) {
          var _suit = activeSuit(next);
          if (_suit) return TILE_NAMES[_suit] + " " + next.counts[_suit - 1] + "/3 \xB7 " + pairs + " pairs left";
        }
        return pairs + " pair" + (pairs === 1 ? '' : 's') + " left. Keep growing!";
      }
      function rejectedSlide(s, m, r, c, d, n) {
        var moved = slide(s.board, r, c, d, n);
        if (!moved) return 'No space in that direction.';
        if (!candidates(moved.board, moved.r, moved.c).length) return 'No match for the selected tile.';
        var t = s.board[r][c],
          lotus = t >= 1 && t <= 3,
          wrong = m.includes('F1') && lotus && t !== activeSuit(s);
        if (wrong && s.delay >= 2) return 'Match the shown flower first.';
        var bloom = m.includes('F2') && lotus && s.counts[t - 1] === 2;
        if (m.includes('F3') && s.ink < 1 + (wrong ? 2 : 0) - (bloom ? 1 : 0)) return 'Not enough ink for this pair.';
        return 'Try another matching slide.';
      }
      function failureReason(s, m) {
        if (!actions(s, m.filter(function (x) {
          return x !== 'F1' && x !== 'F3';
        })).length) return 'board';
        if (m.includes('F3') && actions(s, m.filter(function (x) {
          return x !== 'F3';
        })).length) return 'ink';
        if (m.includes('F1') && s.delay >= 2 && actions(s, m.filter(function (x) {
          return x !== 'F1';
        })).length) return 'order';
        return 'mixed';
      }
      function failureFeedback(s, m) {
        var reason = failureReason(s, m);
        if (reason === 'order') return "Flower order blocks the remaining moves.\n" + (s.delay === 2 ? 'Next wrong flower would reach 3/3 mistakes.' : 'Mistake limit reached.') + " Retry is free.";
        if (reason === 'ink') return "Not enough ink for the available pairs.\nInk left: " + s.ink + ". Retry is free.";
        if (reason === 'mixed') return "Flower order and ink block the remaining moves.\nRetry is free.";
        return 'No clear sliding match is available.\nTry another pair order. Retry is free.';
      }
      var INK_HELP = exports('INK_HELP', 'Pairs cost 1 ink; a wrong flower costs 3 total.\nA flower’s third pair restores 1 ink.');
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameRules.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _createForOfIteratorHelperLoose, cclegacy;
  return {
    setters: [function (module) {
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      exports({
        actions: actions,
        activeSuit: activeSuit,
        candidates: candidates,
        compact: compact,
        copy: copy,
        gestureAction: gestureAction,
        initial: initial,
        nextFromLegal: nextFromLegal,
        runGap: runGap,
        slide: slide,
        stateKey: stateKey,
        status: status,
        step: step
      });
      cclegacy._RF.push({}, "746d59VpYJOsL0bNDv1C7cW", "GameRules", undefined);
      var DIRS = exports('DIRS', ['up', 'down', 'left', 'right']);
      var DELTA = exports('DELTA', {
        up: [-1, 0],
        down: [1, 0],
        left: [0, -1],
        right: [0, 1]
      });
      function copy(s) {
        return {
          board: s.board.map(function (r) {
            return r.slice();
          }),
          gate: s.gate.slice(),
          counts: s.counts.slice(),
          delay: s.delay,
          ink: s.ink
        };
      }
      function initial(l) {
        return copy(l.state);
      }
      function runGap(b, r, c, d) {
        var _b$r;
        var _DELTA$d = DELTA[d],
          dr = _DELTA$d[0],
          dc = _DELTA$d[1],
          rows = b.length,
          cols = b[0].length;
        var run = [];
        if (!((_b$r = b[r]) != null && _b$r[c])) return {
          run: run,
          gap: 0
        };
        var rr = r,
          cc = c,
          gap = 0;
        while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && b[rr][cc]) {
          run.push([rr, cc]);
          rr += dr;
          cc += dc;
        }
        while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && !b[rr][cc]) {
          gap++;
          rr += dr;
          cc += dc;
        }
        return {
          run: run,
          gap: gap
        };
      }
      function slide(b, r, c, d, steps) {
        var _runGap = runGap(b, r, c, d),
          run = _runGap.run,
          gap = _runGap.gap;
        if (!Number.isInteger(steps) || steps < 1 || steps > gap) return null;
        var _DELTA$d2 = DELTA[d],
          dr = _DELTA$d2[0],
          dc = _DELTA$d2[1],
          board = b.map(function (row) {
            return row.slice();
          });
        var values = run.map(function (_ref) {
          var x = _ref[0],
            y = _ref[1];
          return b[x][y];
        });
        run.forEach(function (_ref2) {
          var x = _ref2[0],
            y = _ref2[1];
          board[x][y] = 0;
        });
        run.forEach(function (_ref3, i) {
          var x = _ref3[0],
            y = _ref3[1];
          board[x + dr * steps][y + dc * steps] = values[i];
        });
        return {
          board: board,
          r: r + dr * steps,
          c: c + dc * steps
        };
      }
      function candidates(b, r, c) {
        var t = b[r][c],
          out = [];
        if (!t) return out;
        for (var rr = 0; rr < b.length; rr++) {
          if (rr === r || b[rr][c] !== t) continue;
          var clear = true;
          for (var x = Math.min(rr, r) + 1; x < Math.max(rr, r); x++) if (b[x][c]) clear = false;
          if (clear) out.push([rr, c]);
        }
        for (var cc = 0; cc < b[0].length; cc++) {
          if (cc === c || b[r][cc] !== t) continue;
          var _clear = true;
          for (var _x = Math.min(cc, c) + 1; _x < Math.max(cc, c); _x++) if (b[r][_x]) _clear = false;
          if (_clear) out.push([r, cc]);
        }
        return out.sort(function (a, b) {
          return a[0] - b[0] || a[1] - b[1];
        });
      }
      function compact(b) {
        var nb = b.map(function (row) {
          return row.map(function () {
            return 0;
          });
        });
        var _loop = function _loop(c) {
          var col = b.map(function (row) {
            return row[c];
          }).filter(Boolean);
          col.forEach(function (v, i) {
            nb[b.length - col.length + i][c] = v;
          });
        };
        for (var c = 0; c < b[0].length; c++) {
          _loop(c);
        }
        return nb;
      }
      function activeSuit(s) {
        var _s$gate$find;
        return (_s$gate$find = s.gate.find(function (t) {
          return s.counts[t - 1] < 3;
        })) != null ? _s$gate$find : null;
      }
      function apply(s, a, mech) {
        var r = a[0],
          c = a[1],
          d = a[2],
          steps = a[3],
          ci = a[4];
        var result = slide(s.board, r, c, d, steps);
        if (!result) throw new Error('blocked');
        var pairs = candidates(result.board, result.r, result.c),
          pair = pairs[ci];
        if (!pair || !Number.isInteger(ci)) throw new Error('bad candidate');
        var t = result.board[result.r][result.c],
          ns = copy(s);
        ns.board = result.board;
        ns.board[result.r][result.c] = 0;
        ns.board[pair[0]][pair[1]] = 0;
        if (mech.includes('F3')) ns.ink -= 1;
        if (t >= 1 && t <= 3) {
          ns.counts[t - 1]++;
          if (mech.includes('F1') && t !== activeSuit(s)) {
            ns.delay++;
            if (mech.includes('F3')) ns.ink -= 2;
          }
          if (mech.includes('F2') && ns.counts[t - 1] === 3) {
            ns.board = compact(ns.board);
            if (mech.includes('F3')) ns.ink++;
          }
        }
        return ns;
      }
      function stateKey(s) {
        return JSON.stringify([s.board, s.counts, s.delay, s.ink]);
      }
      function actions(s, mech) {
        var out = [],
          seen = new Set();
        for (var r = 0; r < s.board.length; r++) for (var c = 0; c < s.board[0].length; c++) {
          if (!s.board[r][c]) continue;
          for (var _iterator = _createForOfIteratorHelperLoose(DIRS), _step; !(_step = _iterator()).done;) {
            var d = _step.value;
            var _runGap2 = runGap(s.board, r, c, d),
              gap = _runGap2.gap;
            for (var n = 1; n <= gap; n++) {
              var res = slide(s.board, r, c, d, n);
              for (var ci = 0; ci < candidates(res.board, res.r, res.c).length; ci++) {
                var a = [r, c, d, n, ci],
                  ns = apply(s, a, mech);
                if (mech.includes('F1') && ns.delay >= 3 || mech.includes('F3') && ns.ink < 0) continue;
                var k = stateKey(ns);
                if (seen.has(k)) continue;
                seen.add(k);
                out.push(a);
              }
            }
          }
        }
        return out;
      }
      function status(s, mech) {
        if (mech.includes('F1') && s.delay >= 3 || mech.includes('F3') && s.ink < 0) return 'failed';
        if (!s.board.some(function (row) {
          return row.some(Boolean);
        })) return 'won';
        return actions(s, mech).length ? 'ready' : 'failed';
      }
      function step(s, a, mech) {
        if (!actions(s, mech).some(function (x) {
          return JSON.stringify(x) === JSON.stringify(a);
        })) throw new Error('illegal action');
        return apply(s, a, mech);
      }
      // Search calls this only with an action from actions(s, mech); interactive input still uses step.
      function nextFromLegal(s, a, mech) {
        return apply(s, a, mech);
      }
      // The model deduplicates equivalent moves. Input may originate on the other twin;
      // normalize only to an already legal, identical resulting state.
      function gestureAction(s, mech, r, c, d, steps) {
        var legal = actions(s, mech),
          direct = legal.find(function (a) {
            return a[0] === r && a[1] === c && a[2] === d && a[3] === steps;
          });
        if (direct) return direct;
        var res = slide(s.board, r, c, d, steps);
        if (!res) return null;
        var _loop2 = function _loop2() {
            var key = stateKey(apply(s, [r, c, d, steps, ci], mech));
            var equivalent = legal.find(function (a) {
              return stateKey(apply(s, a, mech)) === key;
            });
            if (equivalent) return {
              v: equivalent
            };
          },
          _ret;
        for (var ci = 0; ci < candidates(res.board, res.r, res.c).length; ci++) {
          _ret = _loop2();
          if (_ret) return _ret.v;
        }
        return null;
      }
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/JadeGame.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameRules.ts', './GameDomain.ts', './Platform.ts', './GameArt.ts', './GameAudioManager.ts', './Tutorial.ts', './GameplayFeedback.ts'], function (exports) {
  var _inheritsLoose, _createForOfIteratorHelperLoose, _createClass, _asyncToGenerator, _regeneratorRuntime, cclegacy, _decorator, profiler, view, ResolutionPolicy, Node, Layers, UITransform, Canvas, Camera, Color, game, Game, sys, UIOpacity, Sprite, Graphics, Label, Button, Vec3, Component, resources, JsonAsset, Font, status, activeSuit, stateKey, runGap, gestureAction, copy, DELTA, GameDomain, supports, sdkFor, storagePort, RewardedAds, GameArt, GameAudioManager, guideCells, openingFeedback, gateCaption, failureFeedback, INK_HELP, rejectedSlide, moveFeedback;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
      _createClass = module.createClass;
      _asyncToGenerator = module.asyncToGenerator;
      _regeneratorRuntime = module.regeneratorRuntime;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      profiler = module.profiler;
      view = module.view;
      ResolutionPolicy = module.ResolutionPolicy;
      Node = module.Node;
      Layers = module.Layers;
      UITransform = module.UITransform;
      Canvas = module.Canvas;
      Camera = module.Camera;
      Color = module.Color;
      game = module.game;
      Game = module.Game;
      sys = module.sys;
      UIOpacity = module.UIOpacity;
      Sprite = module.Sprite;
      Graphics = module.Graphics;
      Label = module.Label;
      Button = module.Button;
      Vec3 = module.Vec3;
      Component = module.Component;
      resources = module.resources;
      JsonAsset = module.JsonAsset;
      Font = module.Font;
    }, function (module) {
      status = module.status;
      activeSuit = module.activeSuit;
      stateKey = module.stateKey;
      runGap = module.runGap;
      gestureAction = module.gestureAction;
      copy = module.copy;
      DELTA = module.DELTA;
    }, function (module) {
      GameDomain = module.GameDomain;
    }, function (module) {
      supports = module.supports;
      sdkFor = module.sdkFor;
      storagePort = module.storagePort;
      RewardedAds = module.RewardedAds;
    }, function (module) {
      GameArt = module.GameArt;
    }, function (module) {
      GameAudioManager = module.GameAudioManager;
    }, function (module) {
      guideCells = module.guideCells;
    }, function (module) {
      openingFeedback = module.openingFeedback;
      gateCaption = module.gateCaption;
      failureFeedback = module.failureFeedback;
      INK_HELP = module.INK_HELP;
      rejectedSlide = module.rejectedSlide;
      moveFeedback = module.moveFeedback;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "b7d6dafF2ZJdqhd1iZtHsIT", "JadeGame", undefined);
      var ccclass = _decorator.ccclass;
      var JadeGame = exports('JadeGame', (_dec = ccclass('JadeGame'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(JadeGame, _Component);
        function JadeGame() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.art = new GameArt();
          _this.audio = void 0;
          _this.font = null;
          _this.hudFont = null;
          _this.model = void 0;
          _this.ads = void 0;
          _this.levels = [];
          _this.ui = void 0;
          _this.board = void 0;
          _this.tileNodes = new Map();
          _this.page = 'loading';
          _this.modalFrom = 'home';
          _this.settingsTab = 'general';
          _this.chapter = 0;
          _this.shopGroup = 'skin';
          _this.shopIndex = 0;
          _this.selectedProp = 'hint';
          _this.adTarget = 'double';
          _this.adMessage = '';
          _this.adReturn = 'home';
          _this.loadingLastMs = 0;
          _this.pendingAdProp = null;
          _this.adEpoch = 0;
          _this.loadEpoch = 0;
          _this.backgroundPaused = false;
          _this.busy = false;
          _this.hintProof = null;
          _this.hintBlockedKey = '';
          _this.hintChecking = false;
          _this.hintCheckEpoch = 0;
          _this.feedback = '';
          _this.hint = null;
          _this.helpFrom = 'home';
          _this.pointer = null;
          _this.heroNode = null;
          _this.logoNode = null;
          _this.idleTime = 0;
          _this.giftNode = null;
          _this.giftPlaying = false;
          _this.giftStart = 0;
          _this.cooldownLabel = null;
          _this.growthKind = 'shortcut';
          _this.growthEpoch = 0;
          _this.growthDeadline = 0;
          _this.growthMessage = '';
          _this.guide = null;
          return _this;
        }
        var _proto = JadeGame.prototype;
        _proto.start = function start() {
          profiler.hideStats();
          view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH);
          this.ui = new Node('GameUI');
          this.node.addChild(this.ui);
          this.ui.layer = Layers.Enum.UI_2D;
          this.ui.addComponent(UITransform).setContentSize(720, 1280);
          this.ui.addComponent(Canvas);
          var camera = new Node('UICamera');
          this.node.addChild(camera);
          camera.setPosition(0, 0, 1000);
          var c = camera.addComponent(Camera);
          c.projection = Camera.ProjectionType.ORTHO;
          c.orthoHeight = 640;
          c.near = .1;
          c.far = 2000;
          c.visibility = Layers.Enum.UI_2D;
          c.clearColor = Color.fromHEX(new Color(), '#fff6e4');
          this.ui.getComponent(Canvas).cameraComponent = c;
          this.audio = GameAudioManager.init();
          game.on(Game.EVENT_HIDE, this.onHide, this);
          game.on(Game.EVENT_SHOW, this.onShow, this);
          this.load();
        };
        _proto.onDestroy = function onDestroy() {
          var _this$ads, _this$model;
          (_this$ads = this.ads) == null || _this$ads.cancel();
          (_this$model = this.model) == null || _this$model.abandonSearch();
          this.loadEpoch++;
          game.off(Game.EVENT_HIDE, this.onHide, this);
          game.off(Game.EVENT_SHOW, this.onShow, this);
        };
        _proto.onHide = function onHide() {
          var _this$model2;
          this.backgroundPaused = true;
          if (this.loadingLastMs > 0) this.loadingLastMs = Date.now();
          this.cancelPointer();
          (_this$model2 = this.model) == null || _this$model2.abandonSearch();
          this.hintCheckEpoch++;
          this.hintChecking = false;
          this.growthEpoch++;
          this.growthDeadline = 0;
        };
        _proto.onShow = function onShow() {
          this.backgroundPaused = false;
          if (this.loadingLastMs > 0) this.loadingLastMs = Date.now();
          if (this.page === 'prop' && this.selectedProp === 'hint') this.show('prop');
        };
        _proto.update = function update(dt) {
          var _this$guide, _this$save, _this$giftNode, _this$cooldownLabel;
          if (this.page === 'loading' && this.loadingLastMs > 0 && !this.backgroundPaused) {
            var progress = globalThis.__LJJNativeLoadProgress;
            if (typeof progress === 'number' && Number.isFinite(progress)) this.loadingLastMs = Math.max(this.loadingLastMs, progress);
            if (Date.now() - this.loadingLastMs >= (sys.isBrowser ? 180000 : 10000)) {
              this.loadEpoch++;
              this.loadingFailure();
            }
          }
          this.idleTime += Math.min(dt, .1);
          if ((_this$guide = this.guide) != null && _this$guide.root.isValid && this.page === 'game' && !this.backgroundPaused && !this.pointer) {
            var _g$hand;
            var g = this.guide;
            g.root.active = true;
            if ((_g$hand = g.hand) != null && _g$hand.isValid) {
              if (this.save.reducedMotion) {
                g.hand.setPosition(g.start);
                g.hand.getComponent(UIOpacity).opacity = 210;
              } else {
                g.elapsed += Math.min(dt, .1);
                var phase = g.elapsed % 2.3,
                  t = Math.max(0, Math.min(1, (phase - .3) / 1.05)),
                  ease = t * t * (3 - 2 * t);
                g.hand.setPosition(g.start.x + (g.end.x - g.start.x) * ease, g.start.y + (g.end.y - g.start.y) * ease, 0);
                g.hand.getComponent(UIOpacity).opacity = phase > 1.75 ? 0 : 235;
              }
            }
          }
          if (this.page === 'home' && !((_this$save = this.save) != null && _this$save.reducedMotion)) {
            var _this$heroNode, _this$logoNode;
            if ((_this$heroNode = this.heroNode) != null && _this$heroNode.isValid) this.heroNode.setPosition(0, -10 + Math.sin(this.idleTime * Math.PI / 1.2) * 4);
            if ((_this$logoNode = this.logoNode) != null && _this$logoNode.isValid) this.logoNode.setPosition(0, 390 + Math.sin(this.idleTime * Math.PI / 1.5) * 3);
          }
          if (this.giftPlaying && (_this$giftNode = this.giftNode) != null && _this$giftNode.isValid) {
            var frame = Math.min(9, Math.floor((Date.now() - this.giftStart) / 85));
            var s = this.giftNode.getComponent(Sprite);
            if (s) s.spriteFrame = this.art.frame('gift' + frame);
            if (frame === 9) this.giftPlaying = false;
          }
          if ((_this$cooldownLabel = this.cooldownLabel) != null && _this$cooldownLabel.isValid) this.cooldownLabel.string = this.cooldownText();
          if (this.growthDeadline && Date.now() > this.growthDeadline) {
            this.growthDeadline = 0;
            this.growthEpoch++;
            this.growthMessage = 'That took too long. Please try again.';
            if (this.page === 'growth') this.show('growth');
          }
        };
        _proto.json = /*#__PURE__*/function () {
          var _json = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(path) {
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                  return _context.abrupt("return", new Promise(function (ok, no) {
                    return resources.load(path, JsonAsset, function (e, a) {
                      return e ? no(e) : ok(a.json);
                    });
                  }));
                case 1:
                case "end":
                  return _context.stop();
              }
            }, _callee);
          }));
          function json(_x) {
            return _json.apply(this, arguments);
          }
          return json;
        }();
        _proto.load = /*#__PURE__*/function () {
          var _load = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2() {
            var _this2 = this;
            var epoch, _this$model$run, _yield$Promise$all, data, table, order, plan, platform, _loop, _iterator, _step;
            return _regeneratorRuntime().wrap(function _callee2$(_context3) {
              while (1) switch (_context3.prev = _context3.next) {
                case 0:
                  epoch = ++this.loadEpoch;
                  this.loadingLastMs = Date.now();
                  this.page = 'loading';
                  this.reset(false);
                  this.text('Loading…', 360, 570, 600, 100, 38);
                  _context3.prev = 5;
                  _context3.next = 8;
                  return Promise.all(['game_levels', 'unlock_table', 'shuffle_order', 'level_plan', 'platform'].map(function (k) {
                    return _this2.json('config/' + k);
                  }));
                case 8:
                  _yield$Promise$all = _context3.sent;
                  data = _yield$Promise$all[0];
                  table = _yield$Promise$all[1];
                  order = _yield$Promise$all[2];
                  plan = _yield$Promise$all[3];
                  platform = _yield$Promise$all[4];
                  _context3.next = 16;
                  return this.art.init();
                case 16:
                  _context3.next = 18;
                  return new Promise(function (ok) {
                    return resources.load('fonts/Baloo2', Font, function (e, a) {
                      return ok(e ? null : a);
                    });
                  });
                case 18:
                  this.font = _context3.sent;
                  _context3.next = 21;
                  return new Promise(function (ok, reject) {
                    return resources.load('fonts/Laila-Medium', Font, function (e, a) {
                      return e ? reject(e) : ok(a);
                    });
                  });
                case 21:
                  this.hudFont = _context3.sent;
                  if (!(epoch !== this.loadEpoch || !this.isValid)) {
                    _context3.next = 24;
                    break;
                  }
                  return _context3.abrupt("return");
                case 24:
                  this.levels = data.levels;
                  _loop = /*#__PURE__*/_regeneratorRuntime().mark(function _loop() {
                    var _row$result_payout_in, _row$result_payout_in2;
                    var l, row;
                    return _regeneratorRuntime().wrap(function _loop$(_context2) {
                      while (1) switch (_context2.prev = _context2.next) {
                        case 0:
                          l = _step.value;
                          row = plan.levels.find(function (v) {
                            return v.level === l.id;
                          });
                          l.payoutCoins = (_row$result_payout_in = (_row$result_payout_in2 = row.result_payout_input) == null ? void 0 : _row$result_payout_in2.sum) != null ? _row$result_payout_in : row.coins;
                          l.baseCoins = row.coins;
                        case 4:
                        case "end":
                          return _context2.stop();
                      }
                    }, _loop);
                  });
                  _iterator = _createForOfIteratorHelperLoose(this.levels);
                case 27:
                  if ((_step = _iterator()).done) {
                    _context3.next = 31;
                    break;
                  }
                  return _context3.delegateYield(_loop(), "t0", 29);
                case 29:
                  _context3.next = 27;
                  break;
                case 31:
                  this.model = new GameDomain(this.levels, table, storagePort(sys.localStorage), order);
                  this.hint = ((_this$model$run = this.model.run) == null || (_this$model$run = _this$model$run.hint) == null ? void 0 : _this$model$run.slice()) || null;
                  this.ads = new RewardedAds(platform.rewardedPlacements);
                  this.audio.preload();
                  this.show('home');
                  _context3.next = 41;
                  break;
                case 38:
                  _context3.prev = 38;
                  _context3.t1 = _context3["catch"](5);
                  if (epoch === this.loadEpoch) this.loadingFailure();
                case 41:
                case "end":
                  return _context3.stop();
              }
            }, _callee2, this, [[5, 38]]);
          }));
          function load() {
            return _load.apply(this, arguments);
          }
          return load;
        }();
        _proto.loadingFailure = function loadingFailure(message) {
          var _this3 = this;
          if (message === void 0) {
            message = 'Game data could not load. Please retry.';
          }
          this.loadingLastMs = 0;
          this.reset(false);
          this.text('Could not start', 360, 420, 600, 100, 42);
          this.text(message + '\nYour saved progress is kept.', 360, 570, 580, 160, 28);
          this.button('RETRY', 360, 770, 300, 110, function () {
            return _this3.load();
          }, true, 'Retry');
        };
        _proto.reset = function reset(bg) {
          var _this4 = this;
          if (bg === void 0) {
            bg = true;
          }
          this.pointer = null;
          this.guide = null;
          this.heroNode = null;
          this.logoNode = null;
          this.giftNode = null;
          this.cooldownLabel = null;
          for (var _i = 0, _arr = [].concat(this.ui.children); _i < _arr.length; _i++) {
            var c = _arr[_i];
            c.active = false;
            c.destroy();
          }
          this.ui.removeAllChildren();
          this.tileNodes.clear();
          var fullHeight = Math.max(1280, view.getVisibleSize().height);
          this.box('Base', 360, 640, 720, fullHeight, '#fff6e4');
          if (bg && this.art.has('background')) {
            var _this$model3;
            var items = ((_this$model3 = this.model) == null ? void 0 : _this$model3.table.items.filter(function (i) {
                return i.group === 'background';
              })) || [],
              index = items.findIndex(function (i) {
                return i.id === _this4.save.background;
              });
            this.image(index > 0 ? 'garden' + index : 'background', 360, 640, 720, fullHeight, 'cover');
          }
        };
        _proto.box = function box(name, x, y, w, h, color, r) {
          if (r === void 0) {
            r = 18;
          }
          var n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          this.ui.addChild(n);
          n.setPosition(x - 360, 640 - y);
          n.addComponent(UITransform).setContentSize(w, h);
          var g = n.addComponent(Graphics);
          g.fillColor = Color.fromHEX(new Color(), color);
          g.roundRect(-w / 2, -h / 2, w, h, r);
          g.fill();
          return n;
        };
        _proto.text = function text(value, x, y, w, h, size, color, name) {
          if (size === void 0) {
            size = 28;
          }
          if (color === void 0) {
            color = '#295f58';
          }
          if (name === void 0) {
            name = 'Text';
          }
          var n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          this.ui.addChild(n);
          n.setPosition(x - 360, 640 - y);
          n.addComponent(UITransform).setContentSize(w, h);
          var l = n.addComponent(Label);
          l.string = value;
          l.fontSize = size;
          l.lineHeight = size * 1.2;
          l.color = Color.fromHEX(new Color(), color);
          l.horizontalAlign = Label.HorizontalAlign.CENTER;
          l.verticalAlign = Label.VerticalAlign.CENTER;
          l.overflow = Label.Overflow.SHRINK;
          l.enableWrapText = true;
          if (this.font) l.font = this.font;
          return l;
        };
        _proto.image = function image(key, x, y, w, h, mode) {
          if (mode === void 0) {
            mode = 'contain';
          }
          return this.art.add(this.ui, key, x - 360, 640 - y, w, h, mode);
        };
        _proto.hudText = function hudText(value, x, y, w, h, size) {
          if (size === void 0) {
            size = 28;
          }
          var label = this.text(value, x, y, w, h, size, '#245a49');
          if (this.hudFont) label.font = this.hudFont;
          label.isBold = size >= 30;
          return label;
        };
        _proto.numbers = function numbers(value, x, y, h, max) {
          var _this5 = this;
          if (h === void 0) {
            h = 44;
          }
          if (max === void 0) {
            max = 250;
          }
          var str = String(value),
            widths = str.split('').map(function (ch) {
              var _this5$art$frame, _this5$art$frame2;
              return /\d/.test(ch) ? (((_this5$art$frame = _this5.art.frame('digit' + ch)) == null ? void 0 : _this5$art$frame.rect.width) || 100) / (((_this5$art$frame2 = _this5.art.frame('digit' + ch)) == null ? void 0 : _this5$art$frame2.rect.height) || 150) * h : h * .4;
            }),
            natural = widths.reduce(function (a, b) {
              return a + b;
            }, 0) + Math.max(0, str.length - 1) * 2,
            scale = Math.min(1, max / natural);
          var left = x - natural * scale / 2;
          str.split('').forEach(function (ch, i) {
            var w = widths[i] * scale;
            if (/\d/.test(ch)) _this5.image('digit' + ch, left + w / 2, y, w, h * scale);else _this5.text(ch, left + w / 2, y, w + 4, h * scale, Math.round(h * .7 * scale));
            left += (widths[i] + 2) * scale;
          });
        };
        _proto.button = function button(key, x, y, w, h, action, enabled, name) {
          var _this6 = this;
          if (enabled === void 0) {
            enabled = true;
          }
          if (name === void 0) {
            name = key;
          }
          var n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          this.ui.addChild(n);
          n.setPosition(x - 360, 640 - y);
          n.addComponent(UITransform).setContentSize(w, h);
          var visual = this.art.add(n, key, 0, 0, w, h);
          if (!visual) {
            var g = n.addComponent(Graphics);
            g.fillColor = Color.fromHEX(new Color(), '#dbebd8');
            g.roundRect(-w / 2, -h / 2, w, h, 22);
            g.fill();
            var label = this.text(key, x, y, w - 16, h - 8, 27);
            label.node.setParent(n);
            label.node.setPosition(0, 0, 0);
          }
          if (!enabled && visual) visual.getComponent(Sprite).color = new Color(185, 195, 190, 255);
          var b = n.addComponent(Button);
          b.interactable = enabled;
          b.transition = Button.Transition.NONE;
          n.on(Node.EventType.TOUCH_START, function () {
            var _this6$save;
            if (enabled && visual && !((_this6$save = _this6.save) != null && _this6$save.reducedMotion)) visual.setScale(.96, .96, 1);
          });
          var restore = function restore() {
            if (visual != null && visual.isValid) visual.setScale(1, 1, 1);
          };
          n.on(Node.EventType.TOUCH_END, restore);
          n.on(Node.EventType.TOUCH_CANCEL, restore);
          n.on(Button.EventType.CLICK, function () {
            var _this6$model;
            if (_this6.backgroundPaused) return;
            _this6.audio.unlock();
            _this6.audio.playSFX('sfx_ui_click');
            action();
            if ((_this6$model = _this6.model) != null && _this6$model.pending && _this6.page !== 'save') {
              _this6.modalFrom = _this6.page;
              _this6.show('save');
            }
          });
          return n;
        };
        _proto.panel = function panel(title, h) {
          if (h === void 0) {
            h = 750;
          }
          var dim = this.box('Modal shield', 360, 640, 720, 1280, '#173c3a60', 0);
          dim.on(Node.EventType.TOUCH_START, function (e) {
            return e.propagationStopped = true;
          });
          this.image('panel', 360, 640, 660, h, 'panel');
          var key = {
            'Take a breath': 'pause',
            'Garden cleared!': 'won',
            'The garden needs a new path': 'failed',
            'Make yourself comfortable': 'settings',
            'A moon-garden puzzle': 'help',
            'A little Jade Dew for you': 'gift',
            'A little extra help': 'ad',
            'Your progress is waiting': 'save',
            'Your garden, one tap away': 'shortcut',
            'Return through your profile': 'profile',
            'Hint': 'hint',
            'Undo': 'undo',
            'Shuffle': 'shuffle'
          };
          if (key[title]) this.image('title_' + key[title], 360, 640 - h / 2 + 100, 440, 85);else this.text(title, 360, 640 - h / 2 + 100, 510, 90, 36);
        };
        _proto.wallet = function wallet() {
          this.image('dew', 245, 67, 52, 58);
          this.numbers(this.save.dew, 370, 67, 40, 205);
        };
        _proto.cooldownText = function cooldownText() {
          var _this$model4;
          var ms = ((_this$model4 = this.model) == null ? void 0 : _this$model4.giftRemaining()) || 0;
          if (!ms) return 'Ready';
          var n = Math.ceil(ms / 1000);
          return Math.floor(n / 60).toString().padStart(2, '0') + ':' + (n % 60).toString().padStart(2, '0');
        };
        _proto.show = function show(p) {
          var _this$model5,
            _this$model6,
            _this7 = this,
            _render$p;
          if ((_this$model5 = this.model) != null && _this$model5.pending && p !== 'save') {
            this.modalFrom = p;
            p = 'save';
          }
          var old = this.page;
          this.cancelPointer();
          this.page = p;
          this.busy = false;
          this.reset();
          var under = !!((_this$model6 = this.model) != null && _this$model6.run) && (['game', 'pause', 'failed', 'won'].includes(p) || ['prop', 'ad', 'save', 'settings', 'help'].includes(p) && ['game', 'pause', 'failed', 'won'].includes(this.modalFrom));
          if (p === 'game') this.audio.playLevelBGM(this.level.id);else if (['home', 'map', 'shop', 'gift'].includes(p)) this.audio.playBGM('bgm_menu');
          if (p === 'pause' || (p === 'settings' || p === 'help') && under) this.audio.pause('user');else if (p !== 'ad') this.audio.resume('user');
          if (p === 'won' && old !== 'won') this.audio.playJingle('jingle_win');
          if (p === 'failed' && old !== 'failed') {
            this.audio.playJingle('jingle_lose');
            this.audio.playSFX('sfx_fail');
          }
          if (under) this.renderGame(p === 'game');
          var render = {
            home: function home() {
              return _this7.home();
            },
            map: function map() {
              return _this7.map();
            },
            pause: function pause() {
              return _this7.pause();
            },
            won: function won() {
              return _this7.won();
            },
            failed: function failed() {
              return _this7.failed();
            },
            settings: function settings() {
              return _this7.settings();
            },
            help: function help() {
              return _this7.help();
            },
            shop: function shop() {
              return _this7.shop();
            },
            gift: function gift() {
              return _this7.gift();
            },
            prop: function prop() {
              return _this7.prop();
            },
            ad: function ad() {
              return _this7.ad();
            },
            save: function save() {
              return _this7.saveError();
            },
            growth: function growth() {
              return _this7.growth();
            }
          };
          (_render$p = render[p]) == null || _render$p.call(render);
        };
        _proto.home = function home() {
          var _this8 = this;
          this.wallet();
          this.logoNode = this.image('logo', 360, 250, 310, 310);
          this.text('A little patience. A garden of possibilities.', 360, 428, 610, 50, 24);
          var index = this.model.table.items.filter(function (i) {
            return i.group === 'skin';
          }).findIndex(function (i) {
            return i.id === _this8.save.hero;
          });
          this.heroNode = this.image(this.save.hero !== 'hero_01' && this.art.has('look' + index) ? 'look' + index : 'hero', 360, 650, 310, 390);
          this.text("Garden journey  " + this.save.cleared.length + " / 70", 360, 888, 580, 50, 26);
          var resume = this.model.run && (!this.model.run.basePaid || !this.model.run.result);
          this.button(resume ? 'CONTINUE' : 'PLAY', 360, 965, 390, 124, function () {
            return resume ? _this8.routeRun() : _this8.begin(_this8.model.nextLevel);
          }, true, 'PLAY');
          this.button('MAP', 140, 1090, 210, 100, function () {
            return _this8.show('map');
          });
          this.button('SKINS', 360, 1090, 210, 100, function () {
            return _this8.show('shop');
          });
          this.button('GIFT', 580, 1090, 210, 100, function () {
            return _this8.show('gift');
          });
          this.button('SETTINGS', 240, 1200, 220, 100, function () {
            _this8.modalFrom = 'home';
            _this8.show('settings');
          });
          this.button('HELP', 480, 1200, 220, 100, function () {
            _this8.modalFrom = 'home';
            _this8.helpFrom = 'home';
            _this8.show('help');
          });
          this.image('panel', 580, 1140, 140, 28, 'panel');
          this.cooldownLabel = this.text(this.cooldownText(), 580, 1140, 130, 24, 19, '#295f58', 'Gift cooldown');
          if (supports('addShortcut') && supports('getShortcutMissionReward')) this.button('HOME', 100, 180, 150, 84, function () {
            return _this8.openGrowth('shortcut');
          }, true, 'Add to Home Screen');
          if (supports('startEntranceMission') && supports('getEntranceMissionReward')) this.button('OPEN', 620, 180, 150, 84, function () {
            return _this8.openGrowth('profile');
          }, true, 'Revisit from Profile');
        };
        _proto.map = function map() {
          var _this9 = this;
          this.wallet();
          this.image('title_map', 360, 176, 460, 85);
          this.text("Chapter " + (this.chapter + 1) + " / 7", 360, 251, 580, 50, 30);
          var _loop2 = function _loop2() {
            var id = _this9.chapter * 10 + i + 1,
              open = id <= _this9.model.nextLevel,
              x = i % 2 ? 495 : 225,
              y = 364 + Math.floor(i / 2) * 126;
            _this9.image('panel', x, y, 230, 112, 'panel');
            _this9.numbers(id, x, y - 10, 44, 100);
            _this9.text(_this9.save.cleared.includes(id) ? 'Cleared' : open ? 'Play' : 'Locked', x, y + 37, 200, 35, 23);
            var n = new Node('Level ' + id);
            n.layer = Layers.Enum.UI_2D;
            _this9.ui.addChild(n);
            n.setPosition(x - 360, 640 - y);
            n.addComponent(UITransform).setContentSize(230, 112);
            n.addComponent(Button).interactable = open;
            n.on(Button.EventType.CLICK, function () {
              return _this9.begin(id);
            });
            if (!open) _this9.image('lock', x + 75, y - 13, 42, 42);
          };
          for (var i = 0; i < 10; i++) {
            _loop2();
          }
          this.button('PREVIOUS', 160, 1050, 235, 100, function () {
            _this9.chapter--;
            _this9.show('map');
          }, this.chapter > 0);
          this.button('NEXT', 560, 1050, 235, 100, function () {
            _this9.chapter++;
            _this9.show('map');
          }, this.chapter < 6);
          this.button('HOME', 360, 1200, 280, 105, function () {
            return _this9.show('home');
          });
        };
        _proto.begin = function begin(id) {
          if (!this.model.start(id)) return;
          this.hint = null;
          this.feedback = openingFeedback(this.level, this.state);
          this.show('game');
        };
        _proto.routeRun = function routeRun() {
          if (!this.model.run) {
            this.show('home');
            return;
          }
          this.show(this.model.run.result ? 'won' : status(this.state, this.level.mechanics) === 'failed' ? 'failed' : 'game');
        };
        _proto.renderGame = function renderGame(active) {
          var _this10 = this;
          var s = this.state;
          if (!s) return;
          var m = this.level.mechanics,
            r = this.model.run;
          this.button('PAUSE', 95, 65, 155, 88, function () {
            return _this10.show('pause');
          }, active, 'PAUSE');
          this.image('panel', 330, 77, 150, 112, 'panel');
          this.image('title_level', 330, 48, 120, 34);
          this.numbers(this.level.id, 330, 100, 43, 130);
          var mechanicPanel = this.image('panel', 360, 200, 680, 120, 'panel');
          if (mechanicPanel) mechanicPanel.name = 'Mechanic jade frame';
          if (m.includes('F1')) {
            var suit = activeSuit(s);
            if (suit) this.image('tile' + suit, 100, 193, 76, 76);
            this.hudText('Match', 220, 165, 145, 30, 22);
            this.numbers((suit ? s.counts[suit - 1] : 3) + '/3', 220, 211, 30, 100);
            this.hudText(gateCaption(s), 150, 237, 260, 26, 18);
            this.hudText('Mistakes', 340, 165, 105, 30, 20);
            this.numbers(s.delay + '/3', 340, 211, 30, 100);
          } else if (m.includes('F2')) this.hudText('Match any pair', 190, 205, 300, 65, 27);else {
            this.hudText('Clear all tiles', 360, 182, 620, 46, 31);
            this.hudText('Match any identical pair', 360, 232, 620, 34, 24);
          }
          if (m.includes('F2')) for (var i = 0; i < 3; i++) {
            this.image('tile' + (i + 1), 420 + i * 73, 192, 56, 60);
            this.numbers(Math.min(3, s.counts[i]) + '/3', 420 + i * 73, 240, 23, 55);
          }
          var feedbackPanel = this.image('panel', 360, m.includes('F3') ? 304 : 307, 660, m.includes('F3') ? 82 : 68, 'panel');
          if (feedbackPanel) feedbackPanel.name = 'Feedback jade frame';
          if (m.includes('F3')) this.inkMeter();else this.hudText(this.feedback || openingFeedback(this.level, s), 360, 307, 620, 56, 25);
          var n = s.board.length,
            cell = this.cell,
            size = n * cell;
          this.image('panel', 360, 650, size + 54, size + 62, 'panel');
          this.board = new Node('Board');
          this.board.layer = Layers.Enum.UI_2D;
          this.ui.addChild(this.board);
          this.board.setPosition(0, -10);
          this.board.addComponent(UITransform).setContentSize(size, size);
          s.board.forEach(function (row, r) {
            return row.forEach(function (face, c) {
              var t = new Node("Tile " + r + "," + c);
              t.layer = Layers.Enum.UI_2D;
              _this10.board.addChild(t);
              t.setPosition((c - (n - 1) / 2) * cell, -(r - (n - 1) / 2) * cell);
              t.addComponent(UITransform).setContentSize(cell - 4, cell - 4);
              if (face) _this10.art.add(t, 'tile' + face, 0, 0, cell - 6, cell - 6);else t.active = false;
              _this10.tileNodes.set(r + "," + c, t);
            });
          });
          var movesPanel = this.image('panel', 360, 980, 660, 100, 'panel');
          if (movesPanel) movesPanel.name = 'Moves jade frame';
          if (this.hint) {
            var a = this.hint;
            this.hudText('Hint: try the highlighted tile.', 360, 976, 650, 82, 24);
            this.highlight(a);
          } else this.hudText(r.moves + " moves   \xB7   " + s.board.flat().filter(Boolean).length / 2 + " pairs left", 360, 980, 600, 50, 27);
          var stockPanel = this.image('panel', 360, 1170, 680, 52, 'panel');
          if (stockPanel) stockPanel.name = 'Stock jade frame';
          ['hint', 'undo', 'shuffle'].forEach(function (k, i) {
            var x = 140 + i * 220;
            _this10.button(k.toUpperCase(), x, 1095, 200, 103, function () {
              return _this10.useProp(k);
            }, active, k.toUpperCase());
            _this10.hudText(k === 'undo' && _this10.level.id <= 8 ? 'Free · go back 1 move' : _this10.model.unlocked(k) ? "Gift " + _this10.save.starter[k] + "  +  Owned " + _this10.save.owned[k] : "Opens at level " + _this10.model.table.props[k].unlock_level, x, 1170, 205, 38, 20);
          });
          if (this.busy) this.hudText('Finding a safe move…', 360, 1230, 620, 44, 24);
          this.board.on(Node.EventType.TOUCH_START, this.touchStart, this);
          this.board.on(Node.EventType.TOUCH_MOVE, this.touchMove, this);
          this.board.on(Node.EventType.TOUCH_END, this.touchEnd, this);
          this.board.on(Node.EventType.TOUCH_CANCEL, this.cancelPointer, this);
        };
        _proto.inkMeter = function inkMeter() {
          var ink = this.state.ink,
            capacity = Math.max(1, this.level.state.ink, ink),
            low = ink <= 3,
            empty = ink <= 0;
          var color = empty || ink <= 1 ? '#c64d37' : low ? '#a96b16' : '#1685a2';
          this.image('ink', 76, 294, 34, 32);
          var caption = this.hudText(empty ? 'INK EMPTY' : low ? 'LOW INK' : 'INK LEFT', 163, 294, 143, 28, 20);
          caption.node.name = 'Ink energy label';
          caption.color = Color.fromHEX(new Color(), color);
          this.numbers(ink, 270, 294, 39, 60);
          var bar = new Node('Ink energy meter');
          bar.layer = Layers.Enum.UI_2D;
          this.ui.addChild(bar);
          bar.setPosition(132, 346);
          bar.addComponent(UITransform).setContentSize(330, 30);
          var g = bar.addComponent(Graphics);
          g.fillColor = Color.fromHEX(new Color(), '#c7ded8');
          g.roundRect(-165, -15, 330, 30, 15);
          g.fill();
          g.strokeColor = Color.fromHEX(new Color(), '#438176');
          g.lineWidth = 2;
          g.stroke();
          var width = 326 * Math.max(0, Math.min(1, ink / capacity));
          if (width > 0) {
            g.fillColor = Color.fromHEX(new Color(), color);
            g.roundRect(-163, -13, Math.max(4, width), 26, Math.min(13, width / 2));
            g.fill();
            if (width > 6) {
              g.fillColor = Color.fromHEX(new Color(), '#ffffff70');
              g.roundRect(-160, 6, Math.max(1, width - 6), 4, 2);
              g.fill();
            }
          }
          var message = this.feedback || openingFeedback(this.level, this.state);
          if (message === openingFeedback(this.level, this.state)) message = 'Pair: -1 · Wrong flower: extra -2 · Bloom: +1';
          message = message.replace(/\nInk [^\n]*$/, '');
          var text = this.hudText(message, 360, 329, 615, 22, 17);
          text.node.name = 'Ink feedback';
        };
        _proto.highlight = function highlight(a) {
          var t = this.tileNodes.get(a[0] + "," + a[1]);
          if (!t) return;
          var g = t.addComponent(Graphics);
          g.strokeColor = Color.fromHEX(new Color(), '#ffdc78');
          g.lineWidth = 5;
          g.roundRect(-this.cell / 2 + 3, -this.cell / 2 + 3, this.cell - 6, this.cell - 6, 15);
          g.stroke();
        };
        _proto.drawGuide = function drawGuide(a) {
          var _this11 = this;
          var cells = guideCells(this.state, a);
          if (!cells) return;
          var root = new Node('Swipe demonstration');
          root.layer = Layers.Enum.UI_2D;
          this.board.addChild(root);
          var n = this.state.board.length,
            point = function point(cell) {
              return new Vec3((cell[1] - (n - 1) / 2) * _this11.cell, -(cell[0] - (n - 1) / 2) * _this11.cell, 0);
            };
          var start = point(cells.source),
            end = point(cells.destination),
            pair = point(cells.pair),
            g = root.addComponent(Graphics);
          // Independent overlay: it never moves a real tile, records a move or consumes stock.
          for (var _i2 = 0, _arr2 = [['#fff9e8', 10], ['#e6aa28', 4]]; _i2 < _arr2.length; _i2++) {
            var _arr2$_i = _arr2[_i2],
              color = _arr2$_i[0],
              width = _arr2$_i[1];
            g.strokeColor = Color.fromHEX(new Color(), color);
            g.lineWidth = width;
            g.moveTo(start.x, start.y);
            g.lineTo(end.x, end.y);
            g.stroke();
            g.moveTo(end.x, end.y);
            g.lineTo(pair.x, pair.y);
            g.stroke();
            g.circle(pair.x, pair.y, this.cell * .38);
            g.stroke();
          }
          var arrow = this.art.add(root, 'guide_arrow', (start.x + end.x) / 2, (start.y + end.y) / 2, this.cell * .34, this.cell * .5);
          if (arrow) arrow.angle = {
            up: 0,
            down: 180,
            left: 90,
            right: -90
          }[a[2]];
          var offset = new Vec3(this.cell * .12, -this.cell * .35),
            from = start.clone().add(offset),
            to = end.clone().add(offset);
          var hand = this.art.add(root, 'guide_hand', from.x, from.y, this.cell * .55, this.cell * .78);
          hand == null || hand.addComponent(UIOpacity);
          this.guide = {
            root: root,
            hand: hand,
            start: from,
            end: to,
            elapsed: 0
          };
        };
        _proto.pause = function pause() {
          var _this12 = this;
          this.panel('Take a breath');
          this.button('CONTINUE', 360, 480, 350, 110, function () {
            return _this12.show('game');
          });
          this.button('RETRY', 360, 630, 350, 110, function () {
            return _this12.begin(_this12.level.id);
          });
          this.button('SETTINGS', 360, 780, 350, 110, function () {
            _this12.modalFrom = 'pause';
            _this12.show('settings');
          });
          this.button('HOME', 360, 930, 350, 110, function () {
            return _this12.show('home');
          });
        };
        _proto.won = function won() {
          var _this13 = this;
          var r = this.model.run;
          this.panel('Garden cleared!');
          for (var i = 0; i < 3; i++) {
            var n = this.image('star', 250 + i * 110, 465, 91, 91);
            if (i >= r.stars && n) n.getComponent(Sprite).color = new Color(175, 185, 180, 255);
          }
          this.text("Level " + r.level + " \xB7 " + r.moves + " moves", 360, 555, 540, 55, 29);
          this.image('dew', 265, 632, 60, 68);
          this.numbers(r.result.total, 390, 632, 58, 200);
          this.text("Outfit bonus +" + r.result.skin_bonus + (r.stars === 3 ? ' · Perfect clear +4' : ''), 360, 697, 520, 48, 24);
          if (!r.basePaid) {
            this.button('CLAIM', 205, 803, 270, 110, function () {
              if (_this13.model.claimBase()) {
                _this13.audio.playSFX('sfx_reward');
                _this13.show('won');
              }
            }, true, 'CLAIM');
            this.button('WATCH x2', 515, 803, 270, 110, function () {
              return _this13.openAd('double', 'won');
            }, true, 'WATCH x2');
          } else {
            this.text(r.doublePaid ? 'Double reward saved' : 'Reward saved', 360, 770, 520, 45, 26);
            if (!r.doublePaid) this.button('WATCH x2', 360, 845, 310, 100, function () {
              return _this13.openAd('double', 'won');
            }, true, 'WATCH x2');
          }
          this.button(r.level < 70 ? 'NEXT' : 'PLAY AGAIN', 505, 970, 270, 105, function () {
            if (!r.basePaid && !_this13.model.claimBase()) return;
            _this13.begin(r.level < 70 ? r.level + 1 : 1);
          }, true, 'NEXT LEVEL');
          this.button('HOME', 205, 970, 260, 105, function () {
            if (!r.basePaid && !_this13.model.claimBase()) return;
            _this13.show('home');
          });
        };
        _proto.failed = function failed() {
          var _this14 = this;
          var learning = this.level.id <= 8;
          this.panel('The garden needs a new path');
          this.image('undo', 360, 500, 140, 150);
          this.text(learning ? 'This path is blocked.\nUndo one move for free and try another pair.' : failureFeedback(this.state, this.level.mechanics), 360, 655, 540, 120, 29);
          if (learning) {
            this.button('UNDO', 360, 805, 340, 115, function () {
              return _this14.useProp('undo');
            }, this.model.run.history.length > 1, 'Free Undo');
            this.text('Free · no item or video needed', 360, 885, 540, 40, 23);
          } else this.button('REVIVE', 360, 805, 340, 115, function () {
            return _this14.openAd('revive', 'failed');
          }, !this.model.run.revived && this.model.run.history.length > 1);
          this.button('RETRY', 210, 1000, 270, 110, function () {
            return _this14.begin(_this14.level.id);
          });
          this.button('HOME', 510, 1000, 270, 110, function () {
            return _this14.show('home');
          });
        };
        _proto.settings = function settings() {
          var _this15 = this;
          this.panel('Make yourself comfortable', 850);
          this.button('GENERAL', 215, 435, 270, 100, function () {
            _this15.settingsTab = 'general';
            _this15.show('settings');
          });
          this.button('SOUND', 505, 435, 270, 100, function () {
            _this15.settingsTab = 'sound';
            _this15.show('settings');
          });
          if (this.settingsTab === 'sound') {
            this.image('title_music', 170, 556, 185, 50);
            this.button(this.audio.musicOn ? 'ON' : 'OFF', 500, 556, 190, 87, function () {
              _this15.audio.setMusic(!_this15.audio.musicOn);
              _this15.show('settings');
            }, true, 'Music toggle');
            this.volume('music', 633);
            this.image('title_sfx', 200, 746, 270, 50);
            this.button(this.audio.sfxOn ? 'ON' : 'OFF', 500, 746, 190, 87, function () {
              _this15.audio.setSFX(!_this15.audio.sfxOn);
              _this15.show('settings');
            }, true, 'Sound effects toggle');
            this.volume('sfx', 823);
            this.text('Tap a level · 0 is silent, 10 is full volume', 360, 926, 550, 70, 23);
            if (!this.audio.settingsSaved) this.button('SAVE', 360, 1010, 300, 95, function () {
              _this15.audio.retrySaveSettings();
              _this15.show('settings');
            });
          } else {
            this.image('title_vibration', 210, 570, 260, 60);
            this.button(this.save.vibration ? 'ON' : 'OFF', 510, 570, 190, 90, function () {
              _this15.model.transaction(function (s) {
                s.vibration = !s.vibration;
              });
              _this15.show('settings');
            }, true, 'Vibration toggle');
            this.image('title_motion', 220, 705, 280, 60);
            this.button(this.save.reducedMotion ? 'ON' : 'OFF', 510, 705, 190, 90, function () {
              _this15.model.transaction(function (s) {
                s.reducedMotion = !s.reducedMotion;
              });
              _this15.show('settings');
            }, true, 'Reduced motion toggle');
            this.button('HELP', 360, 880, 340, 115, function () {
              _this15.helpFrom = 'settings';
              _this15.show('help');
            });
          }
          this.button('CLOSE', 360, 1097, 300, 100, function () {
            return _this15.show(_this15.modalFrom);
          }, true, 'Close settings');
        };
        _proto.volume = function volume(kind, y) {
          var _this16 = this;
          var value = kind === 'music' ? this.audio.musicLevel : this.audio.sfxLevel;
          var _loop3 = function _loop3(i) {
            var x = 80 + i * 56,
              n = _this16.box(kind + ' volume ' + i, x, y, 50, 57, value === i ? '#f5d686' : '#e4f0e6', 11);
            _this16.numbers(i, x, y, 27, 40);
            n.addComponent(Button);
            n.on(Button.EventType.CLICK, function () {
              if (kind === 'music') _this16.audio.setMusicLevel(i);else _this16.audio.setSFXLevel(i);
              _this16.show('settings');
            });
          };
          for (var i = 0; i <= 10; i++) {
            _loop3(i);
          }
        };
        _proto.help = function help() {
          var _this17 = this;
          this.panel('A moon-garden puzzle', 865);
          this.text('SLIDE & MATCH\nSlide identical tiles into a clear row or column. Clear all tiles. No timer.\n\nLEVELS 1–8 · Learn freely\nMatch any flower. Undo is free, even if blocked.\nFrom level 6: three pairs of one flower make tiles fall.\n\nFROM LEVEL 9 · Flower order\nMatch 3 pairs of the shown flower, then the next. Other flowers add a mistake (limit 3). Non-flowers are safe.\n\nFROM LEVEL 13 · Ink\n' + INK_HELP + '\n\nPerfect: no help and no mistakes.', 360, 695, 540, 620, 26);
          this.button('CLOSE', 360, 1100, 320, 100, function () {
            return _this17.show(_this17.helpFrom);
          }, true, 'Close help');
        };
        _proto.shop = function shop() {
          var _this18 = this,
            _item$bonus;
          this.wallet();
          this.image('title_wardrobe', 360, 175, 490, 85);
          this.button('HEROES', 220, 280, 270, 100, function () {
            _this18.shopGroup = 'skin';
            _this18.shopIndex = 0;
            _this18.show('shop');
          });
          this.button('GARDENS', 500, 280, 270, 100, function () {
            _this18.shopGroup = 'background';
            _this18.shopIndex = 0;
            _this18.show('shop');
          });
          var items = this.model.table.items.filter(function (i) {
            return i.group === _this18.shopGroup;
          });
          this.shopIndex = Math.max(0, Math.min(items.length - 1, this.shopIndex));
          var item = items[this.shopIndex],
            owned = this.save.ownedIds.includes(item.id),
            equipped = (this.shopGroup === 'skin' ? this.save.hero : this.save.background) === item.id;
          this.image('panel', 360, 650, 630, 610, 'panel');
          this.image(this.shopGroup === 'skin' ? item.id === 'hero_01' ? 'hero' : 'look' + this.shopIndex : this.shopIndex === 0 ? 'background' : 'garden' + this.shopIndex, 360, 575, this.shopGroup === 'skin' ? 290 : 330, 350);
          this.text(item.name, 360, 810, 580, 85, 32);
          this.text(item.group === 'skin' ? "+" + (((_item$bonus = item.bonus) == null ? void 0 : _item$bonus.pct) || 0) + "% coins when equipped" : 'A new view for your garden', 360, 880, 570, 40, 24);
          this.button('PREVIOUS', 140, 770, 170, 90, function () {
            _this18.shopIndex--;
            _this18.show('shop');
          }, this.shopIndex > 0);
          this.button('NEXT', 580, 770, 170, 90, function () {
            _this18.shopIndex++;
            _this18.show('shop');
          }, this.shopIndex < items.length - 1);
          if (!owned) {
            this.image('dew', 263, 974, 44, 50);
            this.numbers(item.coins, 390, 974, 38, 180);
            this.button('BUY', 360, 1060, 320, 105, function () {
              if (_this18.model.buyLook(item.id)) {
                _this18.audio.playSFX('sfx_reward');
                _this18.show('shop');
              } else {
                _this18.feedback = 'You need more Jade Dew. Keep growing your garden!';
                _this18.show('shop');
              }
            });
            if (item.id === 'hero_limited') this.text('Also gifted on your first Level 70 clear', 360, 930, 570, 38, 22);
          } else this.button(equipped ? 'EQUIPPED' : 'EQUIP', 360, 1035, 340, 110, function () {
            _this18.model.equip(item.id);
            _this18.show('shop');
          }, !equipped);
          if (this.feedback) this.image('panel', 360, 1176, 650, 68, 'panel');
          this.text(this.feedback, 360, 1176, 600, 52, 22);
          this.button('HOME', 360, 1240, 240, 75, function () {
            _this18.feedback = '';
            _this18.show('home');
          });
          this.optionalArtRetry();
        };
        _proto.gift = function gift() {
          var _this19 = this;
          this.wallet();
          this.panel('A little Jade Dew for you');
          this.giftNode = this.image('gift' + (this.giftPlaying ? 0 : 9), 360, 540, 275, 250);
          this.image('dew', 275, 726, 55, 65);
          this.numbers(this.model.table.normal_level_coins * 5, 405, 726, 50, 190);
          var available = this.model.giftAvailable();
          this.cooldownLabel = this.text(available ? 'Ready' : this.cooldownText(), 360, 799, 550, 52, 29);
          this.button('CLAIM', 205, 904, 270, 105, function () {
            if (_this19.model.claimGift()) {
              _this19.audio.playSFX('sfx_reward');
              _this19.giftPlaying = true;
              _this19.giftStart = Date.now();
              _this19.show('gift');
            }
          }, available, 'Gift claim');
          this.button('WATCH x2', 515, 904, 270, 105, function () {
            return _this19.openAd('gift', 'gift');
          }, available, 'Gift video');
          this.button('CLOSE', 360, 1045, 300, 100, function () {
            return _this19.show('home');
          });
          this.optionalArtRetry();
        };
        _proto.optionalArtRetry = function optionalArtRetry() {
          var _this20 = this;
          if (this.art.missing.length) {
            this.text('Some decorations could not load.\nYour buttons still work.', 360, 353, 570, 70, 23);
            this.button('RETRY', 605, 365, 130, 70, function () {
              _this20.art.retryOptional().then(function () {
                return _this20.show(_this20.page);
              });
            }, true, 'Retry decorations');
          }
        };
        _proto.useProp = /*#__PURE__*/function () {
          var _useProp = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3(p, direct) {
            var _this$model$run2, _this$hintProof, _this$model$run4, _solution;
            var id, target, solution, until, _iterator2, _step2, _this$model$run3, candidate, proof;
            return _regeneratorRuntime().wrap(function _callee3$(_context4) {
              while (1) switch (_context4.prev = _context4.next) {
                case 0:
                  if (direct === void 0) {
                    direct = false;
                  }
                  if (!(p === 'hint' && !direct)) {
                    _context4.next = 9;
                    break;
                  }
                  if (!(this.busy || this.hintChecking)) {
                    _context4.next = 4;
                    break;
                  }
                  return _context4.abrupt("return");
                case 4:
                  this.selectedProp = p;
                  this.feedback = '';
                  this.modalFrom = 'game';
                  this.show('prop');
                  return _context4.abrupt("return");
                case 9:
                  if (!(p === 'undo' && this.level.id <= 8 && !this.busy)) {
                    _context4.next = 13;
                    break;
                  }
                  if (this.model.learningUndo() || this.model.pending) {
                    this.hint = null;
                    this.feedback = 'Move restored for free. Try a different pair.';
                    this.audio.playSFX('sfx_undo');
                  } else this.feedback = 'Make a move first. Undo is free in levels 1–8.';
                  this.routeRun();
                  return _context4.abrupt("return");
                case 13:
                  if (!this.busy) {
                    _context4.next = 15;
                    break;
                  }
                  return _context4.abrupt("return");
                case 15:
                  this.selectedProp = p;
                  if (!(p === 'hint' && (_this$model$run2 = this.model.run) != null && _this$model$run2.hint)) {
                    _context4.next = 21;
                    break;
                  }
                  this.hint = this.model.run.hint.slice();
                  this.feedback = 'Your hint is already visible.';
                  this.show('game');
                  return _context4.abrupt("return");
                case 21:
                  if (!(!this.model.unlocked(p) || !this.model.stock(p))) {
                    _context4.next = 26;
                    break;
                  }
                  this.feedback = '';
                  this.modalFrom = 'game';
                  this.show('prop');
                  return _context4.abrupt("return");
                case 26:
                  if (!(p === 'undo')) {
                    _context4.next = 30;
                    break;
                  }
                  if (this.model.undo() || this.model.pending) {
                    this.audio.playSFX('sfx_undo');
                    this.hint = null;
                    this.feedback = 'Last move restored.';
                  } else this.feedback = 'Make a move before using Undo. Nothing spent.';
                  this.show('game');
                  return _context4.abrupt("return");
                case 30:
                  id = this.model.run.id;
                  target = this.state, solution = null;
                  this.feedback = 'Finding a safe move…';
                  this.show('game');
                  this.busy = true;
                  if (!(p === 'shuffle')) {
                    _context4.next = 53;
                    break;
                  }
                  until = Date.now() + 2200;
                  _iterator2 = _createForOfIteratorHelperLoose(this.model.shuffleCandidates());
                case 38:
                  if ((_step2 = _iterator2()).done) {
                    _context4.next = 51;
                    break;
                  }
                  candidate = _step2.value;
                  if (!(Date.now() > until || this.page !== 'game' || ((_this$model$run3 = this.model.run) == null ? void 0 : _this$model$run3.id) !== id)) {
                    _context4.next = 42;
                    break;
                  }
                  return _context4.abrupt("break", 51);
                case 42:
                  _context4.next = 44;
                  return this.model.solve(candidate, Math.min(180, until - Date.now()));
                case 44:
                  proof = _context4.sent;
                  if (!(proof != null && proof.length)) {
                    _context4.next = 49;
                    break;
                  }
                  target = candidate;
                  solution = proof;
                  return _context4.abrupt("break", 51);
                case 49:
                  _context4.next = 38;
                  break;
                case 51:
                  _context4.next = 61;
                  break;
                case 53:
                  if (!(((_this$hintProof = this.hintProof) == null ? void 0 : _this$hintProof.key) === this.hintKey())) {
                    _context4.next = 57;
                    break;
                  }
                  _context4.t0 = this.hintProof.actions;
                  _context4.next = 60;
                  break;
                case 57:
                  _context4.next = 59;
                  return this.model.solve(target);
                case 59:
                  _context4.t0 = _context4.sent;
                case 60:
                  solution = _context4.t0;
                case 61:
                  if (!(this.page !== 'game' || ((_this$model$run4 = this.model.run) == null ? void 0 : _this$model$run4.id) !== id)) {
                    _context4.next = 63;
                    break;
                  }
                  return _context4.abrupt("return");
                case 63:
                  this.busy = false;
                  if ((_solution = solution) != null && _solution.length) {
                    _context4.next = 68;
                    break;
                  }
                  this.feedback = p === 'hint' ? 'No verified hint for this board.\nTry Undo or Shuffle. Your stock is kept.' : 'No verified arrangement found. No stock was spent.';
                  if (p === 'hint') {
                    this.hintBlockedKey = this.hintKey();
                    this.show('prop');
                  } else this.show('game');
                  return _context4.abrupt("return");
                case 68:
                  if (p === 'hint' && (this.model.hintShown(solution[0]) || this.model.pending)) {
                    this.hint = solution[0];
                    this.feedback = 'Try the glowing tile.';
                    this.audio.playSFX('sfx_hint');
                  } else if (p === 'shuffle' && target && (this.model.applyShuffle(target) || this.model.pending)) {
                    this.hint = null;
                    this.feedback = 'A fresh arrangement. Your ink and gate are kept.';
                    this.audio.playSFX('sfx_shuffle');
                  }
                  this.show('game');
                case 70:
                case "end":
                  return _context4.stop();
              }
            }, _callee3, this);
          }));
          function useProp(_x2, _x3) {
            return _useProp.apply(this, arguments);
          }
          return useProp;
        }();
        _proto.prop = function prop() {
          var _this21 = this;
          if (this.selectedProp === 'hint') {
            this.hintPanel();
            return;
          }
          var p = this.selectedProp,
            locked = !this.model.unlocked(p);
          this.panel(p[0].toUpperCase() + p.slice(1));
          this.image(p, 360, 485, 150, 150);
          this.text(locked ? "Opens at level " + this.model.table.props[p].unlock_level + ".\nYour starter gift will wait for you." : "Gift stock " + this.save.starter[p] + " \xB7 Owned " + this.save.owned[p] + "\nBuy one for " + this.model.table.props[p].coins + " Jade Dew\nor watch a video for one.", 360, 685, 540, 170, 29);
          if (!locked) {
            this.button('BUY', 210, 855, 270, 105, function () {
              if (_this21.model.buyProp(p)) {
                _this21.show('game');
                _this21.useProp(p, true);
              } else {
                _this21.feedback = 'Not enough Jade Dew yet.';
                _this21.show('prop');
              }
            }, true, 'Buy ' + p);
            this.button('WATCH +1', 510, 855, 270, 105, function () {
              return _this21.openAd(p, 'game');
            }, this.model.run.adCounts[p] < 2, 'Watch ' + p);
          }
          this.button('CLOSE', 360, 1010, 300, 105, function () {
            return _this21.show('game');
          });
          this.text(this.feedback, 360, 934, 530, 45, 22);
        };
        _proto.hintKey = function hintKey() {
          return this.model.run.id + ':' + stateKey(this.state);
        };
        _proto.hintPanel = function hintPanel() {
          var _this22 = this;
          var r = this.model.run,
            blocked = this.hintBlockedKey === this.hintKey(),
            active = !!r.hint,
            quota = r.adCounts.hint >= 2;
          var extended = blocked || quota;
          this.panel('Hint', extended ? 1080 : 900);
          this.image('hint', 360, extended ? 335 : 400, 115, 115);
          this.text("Gift " + this.save.starter.hint + " \xB7 Owned " + this.save.owned.hint + "\nVideo hints used " + r.adCounts.hint + "/2 this run", 360, extended ? 470 : 520, 540, 80, 27);
          var reason = this.hintChecking ? 'Checking a usable hint before any video…' : blocked ? 'No verified hint for this board.\nTry Undo or Shuffle. Your stock is kept.' : active ? 'Your hint is already highlighted.\nUse HINT to return to it.' : quota ? 'Video limit reached for this run.\nUse your stock, Undo, or Shuffle.' : this.feedback || 'Use your stock, or watch a video for +1 hint.';
          this.text(reason, 360, extended ? 578 : 605, 540, 70, 25);
          this.button('HINT', 210, 700, 270, 100, function () {
            _this22.show('game');
            _this22.useProp('hint', true);
          }, !this.hintChecking && !blocked && (active || this.model.stock('hint') > 0), 'Use hint');
          this.button('BUY', 510, 700, 270, 100, function () {
            if (_this22.model.buyProp('hint')) {
              _this22.show('game');
              _this22.useProp('hint', true);
            } else {
              _this22.feedback = 'Not enough Jade Dew.';
              _this22.show('prop');
            }
          }, !this.hintChecking && !blocked && !active, 'Buy hint');
          this.text(this.model.table.props.hint.coins + " Jade Dew", 510, 765, 260, 24, 21);
          this.button('WATCH +1', 360, extended ? 845 : 865, 350, 110, function () {
            return _this22.prepareHintVideo();
          }, !this.hintChecking && !blocked && !active && !quota, 'Watch hint');
          if (blocked || quota) {
            this.button('UNDO', 210, 950, 270, 90, function () {
              _this22.show('game');
              _this22.useProp('undo');
            }, !this.hintChecking, 'Hint recovery Undo');
            this.button('SHUFFLE', 510, 950, 270, 90, function () {
              _this22.show('game');
              _this22.useProp('shuffle');
            }, !this.hintChecking, 'Hint recovery Shuffle');
          }
          this.button('CLOSE', 360, extended ? 1085 : 1030, 290, 90, function () {
            _this22.hintCheckEpoch++;
            _this22.hintChecking = false;
            _this22.model.abandonSearch();
            _this22.show('game');
          }, true, 'Close hint');
        };
        _proto.prepareHintVideo = /*#__PURE__*/function () {
          var _prepareHintVideo = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee4() {
            var _this$hintProof2;
            var epoch, key, proof;
            return _regeneratorRuntime().wrap(function _callee4$(_context5) {
              while (1) switch (_context5.prev = _context5.next) {
                case 0:
                  if (!(this.hintChecking || this.model.run.adCounts.hint >= 2 || this.model.run.hint)) {
                    _context5.next = 2;
                    break;
                  }
                  return _context5.abrupt("return");
                case 2:
                  epoch = ++this.hintCheckEpoch, key = this.hintKey();
                  this.hintChecking = true;
                  this.show('prop');
                  if (!(((_this$hintProof2 = this.hintProof) == null ? void 0 : _this$hintProof2.key) === key)) {
                    _context5.next = 9;
                    break;
                  }
                  _context5.t0 = this.hintProof.actions;
                  _context5.next = 12;
                  break;
                case 9:
                  _context5.next = 11;
                  return this.model.solve(this.state);
                case 11:
                  _context5.t0 = _context5.sent;
                case 12:
                  proof = _context5.t0;
                  if (!(epoch !== this.hintCheckEpoch)) {
                    _context5.next = 15;
                    break;
                  }
                  return _context5.abrupt("return");
                case 15:
                  this.hintChecking = false;
                  if (!(this.page !== 'prop' || this.hintKey() !== key)) {
                    _context5.next = 18;
                    break;
                  }
                  return _context5.abrupt("return");
                case 18:
                  if (proof != null && proof.length) {
                    _context5.next = 23;
                    break;
                  }
                  this.hintBlockedKey = key;
                  this.feedback = 'No verified hint. Your stock is kept.';
                  this.show('prop');
                  return _context5.abrupt("return");
                case 23:
                  this.hintProof = {
                    key: key,
                    actions: proof
                  };
                  this.hintBlockedKey = '';
                  this.openAd('hint', 'game');
                case 26:
                case "end":
                  return _context5.stop();
              }
            }, _callee4, this);
          }));
          function prepareHintVideo() {
            return _prepareHintVideo.apply(this, arguments);
          }
          return prepareHintVideo;
        }();
        _proto.openAd = function openAd(target, from) {
          this.model.abandonSearch();
          this.adTarget = target;
          this.adReturn = from;
          this.modalFrom = from;
          this.adMessage = '';
          this.show('ad');
        };
        _proto.ad = function ad() {
          var _this23 = this;
          var t = this.adTarget;
          this.panel('A little extra help');
          var body = t === 'double' ? "Watch a video to double this clear.\nTotal: " + this.model.run.result.doubled + " Jade Dew" : t === 'gift' ? "Watch a video for " + this.model.table.normal_level_coins * 10 + " Jade Dew.\nYour gift then rests for 30 minutes." : t === 'revive' ? 'Watch a video to restore your last two actions.\nContinue this run once.' : "Watch a video for one " + t + ".\nOnly a successful effect uses the item.";
          this.image(t === 'gift' ? 'gift9' : t === 'double' ? 'dew' : t === 'revive' ? 'undo' : t, 360, 486, 155, 155);
          this.text(body, 360, 671, 540, 160, 30);
          this.text(this.adMessage, 360, 800, 550, 85, 25);
          if (!this.ads.busy) this.button(t === 'double' || t === 'gift' ? 'WATCH x2' : t === 'revive' ? 'WATCH' : 'WATCH +1', 360, 920, 350, 110, function () {
            return _this23.watchAd();
          }, true, 'Watch video');
          this.button('NO THANKS', 360, 1050, 330, 100, function () {
            _this23.adEpoch++;
            _this23.ads.cancel();
            _this23.audio.resume('ad');
            if (t === 'double' && !_this23.model.run.basePaid) _this23.model.claimBase();
            _this23.show(_this23.adReturn);
          }, true, 'Close ad');
        };
        _proto.watchAd = /*#__PURE__*/function () {
          var _watchAd = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee5() {
            var _this$model$run5;
            var t, id, epoch, request, outcome, ok;
            return _regeneratorRuntime().wrap(function _callee5$(_context6) {
              while (1) switch (_context6.prev = _context6.next) {
                case 0:
                  if (!this.ads.busy) {
                    _context6.next = 2;
                    break;
                  }
                  return _context6.abrupt("return");
                case 2:
                  t = this.adTarget, id = (_this$model$run5 = this.model.run) == null ? void 0 : _this$model$run5.id, epoch = ++this.adEpoch;
                  if (!(t === 'double' && !this.model.claimBase())) {
                    _context6.next = 5;
                    break;
                  }
                  return _context6.abrupt("return");
                case 5:
                  if (!(t === 'gift' && !this.model.giftAvailable())) {
                    _context6.next = 7;
                    break;
                  }
                  return _context6.abrupt("return");
                case 7:
                  this.audio.pause('ad');
                  this.adMessage = 'Your video is opening…';
                  request = this.ads.show(t, t === 'double' ? 0 : t === 'gift' ? 1 : 2);
                  this.show('ad');
                  _context6.next = 13;
                  return request;
                case 13:
                  outcome = _context6.sent;
                  this.audio.resume('ad');
                  if (!(epoch !== this.adEpoch || this.page !== 'ad')) {
                    _context6.next = 17;
                    break;
                  }
                  return _context6.abrupt("return");
                case 17:
                  if (!(outcome === 'completed')) {
                    _context6.next = 34;
                    break;
                  }
                  ok = false;
                  if (t === 'double' && id) ok = this.model.doubleResult(id);else if (t === 'gift') ok = this.model.claimGift(true);else if (t === 'revive' && id) ok = this.model.revive(id);else if (id) ok = this.model.grantPropAd(t, id);
                  if (!this.model.pending) {
                    _context6.next = 25;
                    break;
                  }
                  this.pendingAdProp = ['hint', 'undo', 'shuffle'].includes(t) ? t : null;
                  this.modalFrom = this.adReturn;
                  this.show('save');
                  return _context6.abrupt("return");
                case 25:
                  if (!ok) {
                    _context6.next = 31;
                    break;
                  }
                  this.audio.playSFX('sfx_reward');
                  this.feedback = 'Reward saved.';
                  this.show(t === 'revive' ? 'game' : this.adReturn);
                  if (['hint', 'undo', 'shuffle'].includes(t)) this.useProp(t, true);
                  return _context6.abrupt("return");
                case 31:
                  this.adMessage = 'That reward is already collected.';
                  _context6.next = 35;
                  break;
                case 34:
                  this.adMessage = outcome === 'unavailable' ? 'No video is available right now.\nYou can keep playing for free.' : outcome === 'cancelled' ? 'Video closed. No extra reward was added.' : outcome === 'timeout' ? 'The video took too long. Please retry.' : 'The video could not play. Please retry.';
                case 35:
                  this.show('ad');
                case 36:
                case "end":
                  return _context6.stop();
              }
            }, _callee5, this);
          }));
          function watchAd() {
            return _watchAd.apply(this, arguments);
          }
          return watchAd;
        }();
        _proto.saveError = function saveError() {
          var _this24 = this;
          this.panel('Your progress is waiting');
          this.text('Could not save right now.\nYour completed action is kept here.\nRetry without watching another video.', 360, 630, 540, 230, 30);
          this.button('SAVE', 360, 860, 330, 115, function () {
            if (_this24.model.retrySave()) {
              _this24.audio.playSFX('sfx_reward');
              var prop = _this24.pendingAdProp;
              _this24.pendingAdProp = null;
              if (['game', 'won', 'failed'].includes(_this24.modalFrom)) _this24.routeRun();else _this24.show(_this24.modalFrom);
              if (prop && _this24.page === 'game') _this24.useProp(prop, true);
            }
          }, true, 'Retry saving');
        };
        _proto.openGrowth = function openGrowth(kind) {
          this.growthKind = kind;
          this.growthMessage = '';
          this.modalFrom = 'home';
          this.show('growth');
        };
        _proto.growth = function growth() {
          var _this25 = this;
          var shortcut = this.growthKind === 'shortcut',
            claimed = this.save.growth.includes(this.growthKind);
          this.panel(shortcut ? 'Your garden, one tap away' : 'Return through your profile');
          this.image(shortcut ? 'gate' : 'hero', 360, 488, 180, 190);
          this.text(shortcut ? 'Add this garden to your home screen.\nReturn through that shortcut, then check.' : 'Open your TikTok profile sidebar.\nReturn to this garden, then check.', 360, 670, 540, 155, 28);
          this.text("One-time reward: " + this.model.table.normal_level_coins * 5 + " Jade Dew\n" + (claimed ? 'Claimed' : this.growthMessage), 360, 816, 540, 100, 26);
          this.button('OPEN', 210, 950, 260, 100, function () {
            return _this25.growthOpen();
          }, !claimed);
          this.button(claimed ? 'EQUIPPED' : 'CHECK', 510, 950, 260, 100, function () {
            return _this25.growthCheck();
          }, !claimed && !this.growthDeadline, 'Check reward');
          this.button('CLOSE', 360, 1085, 300, 100, function () {
            _this25.growthEpoch++;
            _this25.growthDeadline = 0;
            _this25.show('home');
          });
        };
        _proto.growthOpen = function growthOpen() {
          var _this26 = this;
          var method = this.growthKind === 'shortcut' ? 'addShortcut' : 'startEntranceMission',
            sdk = sdkFor(method);
          try {
            var result = sdk == null ? void 0 : sdk[method]({
              success: function success() {},
              fail: function fail() {
                _this26.growthMessage = 'Could not open. Please retry.';
                _this26.show('growth');
              }
            });
            Promise.resolve(result)["catch"](function () {
              _this26.growthMessage = 'Could not open. Please retry.';
              if (_this26.page === 'growth') _this26.show('growth');
            });
          } catch (_unused) {
            this.growthMessage = 'Could not open. Please retry.';
            this.show('growth');
          }
        };
        _proto.growthCheck = function growthCheck() {
          var _this27 = this;
          if (this.growthDeadline) return;
          var method = this.growthKind === 'shortcut' ? 'getShortcutMissionReward' : 'getEntranceMissionReward',
            sdk = sdkFor(method),
            epoch = ++this.growthEpoch,
            kind = this.growthKind;
          var done = false;
          this.growthDeadline = Date.now() + 10000;
          this.growthMessage = 'Checking…';
          var finish = function finish(result, error) {
            if (error === void 0) {
              error = false;
            }
            if (done || epoch !== _this27.growthEpoch || _this27.page !== 'growth') return;
            if (!error && result === undefined) return;
            done = true;
            _this27.growthDeadline = 0;
            if ((result == null ? void 0 : result.canReceiveReward) === true) {
              _this27.model.transaction(function (s) {
                if (s.growth.includes(kind)) return false;
                s.dew += _this27.model.table.normal_level_coins * 5;
                s.growth.push(kind);
              });
              _this27.growthMessage = 'Reward saved.';
            } else _this27.growthMessage = error ? 'Could not check. Please retry.' : 'Return through this entry first, then check again.';
            _this27.show('growth');
          };
          try {
            var v = sdk == null ? void 0 : sdk[method]({
              success: function success(r) {
                return finish(r);
              },
              fail: function fail() {
                return finish(null, true);
              }
            });
            if (v != null && v.then) v.then(function (r) {
              return finish(r != null ? r : null);
            }, function () {
              return finish(null, true);
            });
            if (!sdk) finish(null, true);
          } catch (_unused2) {
            finish(null, true);
          }
          this.show('growth');
        };
        _proto.point = function point(e) {
          var p = e.getLocation(),
            c = this.ui.getComponent(Canvas).cameraComponent;
          return this.board.getComponent(UITransform).convertToNodeSpaceAR(c.screenToWorld(new Vec3(p.x, p.y, 0)));
        };
        _proto.touchStart = function touchStart(e) {
          var _board$r, _this$tileNodes$get;
          if (this.pointer || this.backgroundPaused || this.page !== 'game' || this.busy || this.model.pending) return;
          var p = this.point(e),
            n = this.state.board.length,
            c = Math.floor((p.x + n * this.cell / 2) / this.cell),
            r = Math.floor((-p.y + n * this.cell / 2) / this.cell);
          if (!((_board$r = this.state.board[r]) != null && _board$r[c])) return;
          this.pointer = {
            id: e.getID(),
            r: r,
            c: c,
            x: p.x,
            y: p.y
          };
          if (this.guide) this.guide.root.active = false;
          (_this$tileNodes$get = this.tileNodes.get(r + "," + c)) == null || _this$tileNodes$get.setScale(.98, .98, 1);
        };
        _proto.direction = function direction(dx, dy) {
          return Math.abs(dx) > Math.abs(dy) ? {
            d: dx > 0 ? 'right' : 'left',
            distance: Math.abs(dx)
          } : {
            d: dy > 0 ? 'up' : 'down',
            distance: Math.abs(dy)
          };
        };
        _proto.snappedSlide = function snappedSlide(distance, gap) {
          var bounded = Math.min(distance, gap * this.cell),
            steps = Math.round(bounded / this.cell);
          return {
            steps: steps,
            amount: steps ? steps * this.cell : bounded
          };
        };
        _proto.touchMove = function touchMove(e) {
          var p = this.pointer;
          if (!p || p.id !== e.getID() || this.backgroundPaused) return;
          var q = this.point(e),
            _this$direction = this.direction(q.x - p.x, q.y - p.y),
            d = _this$direction.d,
            distance = _this$direction.distance,
            _runGap = runGap(this.state.board, p.r, p.c, d),
            run = _runGap.run,
            gap = _runGap.gap,
            _DELTA$d = DELTA[d],
            dr = _DELTA$d[0],
            dc = _DELTA$d[1];
          this.restoreTiles();
          var amount = this.snappedSlide(distance, gap).amount;
          for (var _iterator3 = _createForOfIteratorHelperLoose(run), _step3; !(_step3 = _iterator3()).done;) {
            var _step3$value = _step3.value,
              r = _step3$value[0],
              c = _step3$value[1];
            var t = this.tileNodes.get(r + "," + c);
            t.setPosition(t.position.x + dc * amount, t.position.y - dr * amount, 0);
          }
        };
        _proto.touchEnd = function touchEnd(e) {
          var p = this.pointer;
          if (!p || p.id !== e.getID()) return;
          var q = this.point(e),
            _this$direction2 = this.direction(q.x - p.x, q.y - p.y),
            d = _this$direction2.d,
            distance = _this$direction2.distance;
          this.pointer = null;
          this.restoreTiles();
          if (this.backgroundPaused || distance < 15 * this.cell / 80) return;
          var gap = runGap(this.state.board, p.r, p.c, d).gap;
          if (!gap) {
            this.invalid(rejectedSlide(this.state, this.level.mechanics, p.r, p.c, d, 1));
            return;
          }
          var n = this.snappedSlide(distance, gap).steps;
          if (!n) {
            this.invalid('Slide a little farther.');
            return;
          }
          var a = gestureAction(this.state, this.level.mechanics, p.r, p.c, d, n);
          if (!a) {
            this.invalid(rejectedSlide(this.state, this.level.mechanics, p.r, p.c, d, n));
            return;
          }
          var old = copy(this.state);
          if (this.model.recordMove(a)) {
            this.hint = null;
            this.audio.playSFX('sfx_tile_slide');
            this.audio.playSFX('sfx_match');
            if (this.state.delay > old.delay) this.audio.playSFX('sfx_gate_delay');else if (this.level.mechanics.includes('F2') && this.state.counts.some(function (v, i) {
              return v === 3 && old.counts[i] < 3;
            })) this.audio.playSFX('sfx_pot_bloom');
            this.feedback = moveFeedback(old, this.state, this.level.mechanics);
            if (this.save.vibration) try {
              var _sdkFor;
              (_sdkFor = sdkFor('vibrateShort')) == null || _sdkFor.vibrateShort({
                type: 'light'
              });
            } catch (_unused3) {}
            this.routeRun();
          } else if (this.model.pending) {
            this.modalFrom = 'game';
            this.show('save');
          }
        };
        _proto.invalid = function invalid(message) {
          this.audio.playSFX('sfx_invalid');
          this.feedback = message;
          this.show('game');
        };
        _proto.restoreTiles = function restoreTiles() {
          var _this28 = this;
          if (!this.state) return;
          var n = this.state.board.length;
          this.tileNodes.forEach(function (t, key) {
            if (!t.isValid) return;
            var _key$split$map = key.split(',').map(Number),
              r = _key$split$map[0],
              c = _key$split$map[1];
            t.setPosition((c - (n - 1) / 2) * _this28.cell, -(r - (n - 1) / 2) * _this28.cell);
            t.setScale(1, 1, 1);
          });
        };
        _proto.cancelPointer = function cancelPointer(e) {
          var _this$board, _this$guide2;
          if (e && this.pointer && e.getEventCode() === Node.EventType.TOUCH_END) {
            this.touchEnd(e);
            return;
          }
          var blocked = '';
          var p = this.pointer;
          if (e && p && this.page === 'game' && (_this$board = this.board) != null && _this$board.isValid) {
            var q = this.point(e),
              _this$direction3 = this.direction(q.x - p.x, q.y - p.y),
              d = _this$direction3.d,
              distance = _this$direction3.distance;
            if (distance >= 15 * this.cell / 80 && !runGap(this.state.board, p.r, p.c, d).gap) blocked = rejectedSlide(this.state, this.level.mechanics, p.r, p.c, d, 1);
          }
          this.pointer = null;
          this.restoreTiles();
          if ((_this$guide2 = this.guide) != null && _this$guide2.root.isValid) {
            this.guide.elapsed = 0;
            this.guide.root.active = this.page === 'game';
          }
          if (blocked) {
            this.feedback = blocked;
            this.show('game');
          }
        };
        _createClass(JadeGame, [{
          key: "state",
          get: function get() {
            var _this$model7;
            return (_this$model7 = this.model) == null || (_this$model7 = _this$model7.run) == null ? void 0 : _this$model7.state;
          }
        }, {
          key: "save",
          get: function get() {
            var _this$model8;
            return (_this$model8 = this.model) == null ? void 0 : _this$model8.save;
          }
        }, {
          key: "level",
          get: function get() {
            var _this$model9;
            return (_this$model9 = this.model) == null ? void 0 : _this$model9.level;
          }
        }, {
          key: "moves",
          get: function get() {
            var _this$model10;
            return ((_this$model10 = this.model) == null || (_this$model10 = _this$model10.run) == null ? void 0 : _this$model10.moves) || 0;
          }
        }, {
          key: "cell",
          get: function get() {
            var _this$state, _this$state2;
            return ((_this$state = this.state) == null ? void 0 : _this$state.board.length) === 5 ? 104 : ((_this$state2 = this.state) == null ? void 0 : _this$state2.board.length) === 6 ? 90 : 80;
          }
        }]);
        return JadeGame;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/main", ['./AdRewards.ts', './GameArt.ts', './GameDomain.ts', './GameRules.ts', './GameplayFeedback.ts', './JadeGame.ts', './Platform.ts', './Progress.ts', './Tutorial.ts', './GameAudioButton.ts', './GameAudioConfig.ts', './GameAudioManager.ts'], function () {
  return {
    setters: [null, null, null, null, null, null, null, null, null, null, null, null],
    execute: function () {}
  };
});

System.register("chunks:///_virtual/Platform.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './AdRewards.ts', './GameDomain.ts'], function (exports) {
  var _createClass, _asyncToGenerator, _regeneratorRuntime, cclegacy, createAdGate, adGateStart, adGateFinish, SAVE_KEY;
  return {
    setters: [function (module) {
      _createClass = module.createClass;
      _asyncToGenerator = module.asyncToGenerator;
      _regeneratorRuntime = module.regeneratorRuntime;
    }, function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      createAdGate = module.createAdGate;
      adGateStart = module.adGateStart;
      adGateFinish = module.adGateFinish;
    }, function (module) {
      SAVE_KEY = module.SAVE_KEY;
    }],
    execute: function () {
      exports({
        sdkFor: sdkFor,
        storagePort: storagePort,
        supports: supports
      });
      cclegacy._RF.push({}, "c5c2au+T0FMKqh9/jGj0gM8", "Platform", undefined);
      function sdkFor(method) {
        var _g$TTMinis;
        var g = globalThis;
        return [(_g$TTMinis = g.TTMinis) == null ? void 0 : _g$TTMinis.game, g.tt, g.wx].find(function (s) {
          return s && typeof s[method] === 'function';
        }) || null;
      }
      function supports(method) {
        var sdk = sdkFor(method);
        try {
          return !!sdk && typeof sdk.canIUse === 'function' && sdk.canIUse(method) === true;
        } catch (_unused) {
          return false;
        }
      }
      function storagePort(local) {
        return {
          read: function read() {
            var sdk = sdkFor('getStorageSync');
            return sdk ? sdk.getStorageSync(SAVE_KEY) : local.getItem(SAVE_KEY);
          },
          write: function write(value) {
            var sdk = sdkFor('setStorageSync');
            if (sdk) sdk.setStorageSync(SAVE_KEY, value);else local.setItem(SAVE_KEY, value);
          }
        };
      }
      var RewardedAds = exports('RewardedAds', /*#__PURE__*/function () {
        function RewardedAds(placements, deadlineMs) {
          if (deadlineMs === void 0) {
            deadlineMs = 45000;
          }
          this.gate = createAdGate();
          this.activeLabel = '';
          this.cancelOwner = null;
          this.placements = placements;
          this.deadlineMs = deadlineMs;
        }
        var _proto = RewardedAds.prototype;
        _proto.cancel = function cancel() {
          var _this$cancelOwner;
          (_this$cancelOwner = this.cancelOwner) == null || _this$cancelOwner.call(this);
        };
        _proto.show = /*#__PURE__*/function () {
          var _show = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(label, slot) {
            var _this = this;
            var sdk, token;
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                  if (slot === void 0) {
                    slot = 0;
                  }
                  sdk = sdkFor('createRewardedVideoAd');
                  if (!(!sdk || !supports('createRewardedVideoAd') || !this.placements[slot])) {
                    _context.next = 4;
                    break;
                  }
                  return _context.abrupt("return", 'unavailable');
                case 4:
                  token = adGateStart(this.gate);
                  if (token) {
                    _context.next = 7;
                    break;
                  }
                  return _context.abrupt("return", 'busy');
                case 7:
                  this.activeLabel = label;
                  return _context.abrupt("return", new Promise(function (resolve) {
                    var done = false,
                      owned = true,
                      ad = null;
                    var cleanup = function cleanup() {
                      try {
                        var _ad, _ad2, _ad3;
                        (_ad = ad) == null || _ad.offClose == null || _ad.offClose(closed);
                        (_ad2 = ad) == null || _ad2.offError == null || _ad2.offError(error);
                        (_ad3 = ad) == null || _ad3.destroy == null || _ad3.destroy();
                      } catch (_unused2) {}
                    };
                    var finish = function finish(outcome) {
                      if (done) return;
                      done = true;
                      clearTimeout(timer);
                      var accepted = adGateFinish(_this.gate, token, outcome === 'completed' && owned);
                      cleanup();
                      _this.cancelOwner = null;
                      _this.activeLabel = '';
                      resolve(outcome === 'completed' && !accepted ? 'cancelled' : outcome);
                    };
                    var closed = function closed(result) {
                      return finish((result == null ? void 0 : result.isEnded) === true ? 'completed' : 'cancelled');
                    };
                    var error = function error() {
                      return finish('failed');
                    };
                    var timer = setTimeout(function () {
                      return finish('timeout');
                    }, _this.deadlineMs);
                    _this.cancelOwner = function () {
                      owned = false;
                      finish('cancelled');
                    };
                    try {
                      ad = sdk.createRewardedVideoAd({
                        adUnitId: _this.placements[slot]
                      });
                      if (!ad || typeof ad.onClose !== 'function' || typeof ad.onError !== 'function' || typeof ad.show !== 'function') {
                        finish('failed');
                        return;
                      }
                      ad.onClose(closed);
                      ad.onError(error);
                      Promise.resolve(ad.show())["catch"](error);
                    } catch (_unused3) {
                      finish('failed');
                    }
                  }));
                case 9:
                case "end":
                  return _context.stop();
              }
            }, _callee, this);
          }));
          function show(_x, _x2) {
            return _show.apply(this, arguments);
          }
          return show;
        }();
        _createClass(RewardedAds, [{
          key: "busy",
          get: function get() {
            return this.gate.busy;
          }
        }]);
        return RewardedAds;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Progress.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _extends, cclegacy;
  return {
    setters: [function (module) {
      _extends = module.extends;
    }, function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      exports({
        clearLevel: clearLevel,
        newSave: newSave,
        parseSave: parseSave,
        spend: spend
      });
      cclegacy._RF.push({}, "86d96RYrmFJ6rVdf/HTFp+p", "Progress", undefined);
      var SAVE_KEY = exports('SAVE_KEY', 'ljj/progress/v1');
      function newSave() {
        return {
          version: 1,
          cleared: [],
          dew: 0,
          starter: {
            hint: 1,
            undo: 1,
            shuffle: 1
          }
        };
      }
      function parseSave(raw) {
        if (raw === null) return newSave();
        var s = JSON.parse(raw);
        if ((s == null ? void 0 : s.version) !== 1 || !Array.isArray(s.cleared) || s.cleared.some(function (v) {
          return !Number.isInteger(v) || v < 1 || v > 70;
        }) || new Set(s.cleared).size !== s.cleared.length || !Number.isSafeInteger(s.dew) || s.dew < 0 || !s.starter || ['hint', 'undo', 'shuffle'].some(function (k) {
          return !Number.isInteger(s.starter[k]) || s.starter[k] < 0 || s.starter[k] > 1;
        })) throw new Error('Save is unreadable. Original data kept.');
        return s;
      }
      function clearLevel(s, id, coins) {
        if (!Number.isInteger(id) || id < 1 || id > 70 || !Number.isSafeInteger(coins) || coins < 0) throw new Error('Invalid reward');
        if (s.cleared.includes(id)) return s;
        return _extends({}, s, {
          cleared: [].concat(s.cleared, [id]).sort(function (a, b) {
            return a - b;
          }),
          dew: s.dew + coins,
          starter: _extends({}, s.starter)
        });
      }
      function spend(s, prop) {
        var _extends2;
        if (!s.starter[prop]) return s;
        return _extends({}, s, {
          cleared: [].concat(s.cleared),
          starter: _extends({}, s.starter, (_extends2 = {}, _extends2[prop] = s.starter[prop] - 1, _extends2))
        });
      }
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Tutorial.ts", ['cc', './GameRules.ts'], function (exports) {
  var cclegacy, initial, step, stateKey, slide, candidates;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      initial = module.initial;
      step = module.step;
      stateKey = module.stateKey;
      slide = module.slide;
      candidates = module.candidates;
    }],
    execute: function () {
      exports({
        guideCells: guideCells,
        openingGuide: openingGuide
      });
      cclegacy._RF.push({}, "1da03FyTzFOkZ9E9F/RnMd3", "Tutorial", undefined);

      // Only continue the free opening lesson while its exact board proof still matches.
      // Off-route players keep full control and can request a normal, stock-funded Hint.
      function openingGuide(level, state, moves) {
        var _level$solution;
        if (level.id > 2 || moves < 0 || moves >= 3 || !((_level$solution = level.solution) != null && _level$solution[moves])) return null;
        var expected = initial(level);
        for (var i = 0; i < moves; i++) expected = step(expected, level.solution[i], level.mechanics);
        return stateKey(expected) === stateKey(state) ? level.solution[moves].slice() : null;
      }
      function guideCells(state, action) {
        var r = action[0],
          c = action[1],
          d = action[2],
          steps = action[3],
          ci = action[4],
          after = slide(state.board, r, c, d, steps);
        if (!after) return null;
        var pair = candidates(after.board, after.r, after.c)[ci];
        return pair ? {
          source: [r, c],
          destination: [after.r, after.c],
          pair: pair
        } : null;
      }
      cclegacy._RF.pop();
    }
  };
});

(function(r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});
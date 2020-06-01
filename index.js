// Kuma prediction by Kasea


module.exports = function kuma(mod) {
    const is_debug_mode = false; // debug mode for coding

    let gameId;
    let is_mom = null;
    let accept_action_end = null;
    let current_skill_id = 0xFFFF;
    let force_position = null;
    let is_enabled = true;

    const skill_lengths_kid = {
        1101: 655, // l click
        3110: [591, 1466], // 3 (fire breath)
        4120: 1903, // 4 (machine gun)
        4130: 890, // 2 (slow ball)
        4140: 890, // 1
        4150: 850, // mouse 4 (jump back)
        4160: [500, 515, 420], // r click (roll)
    };

    const skill_lengths_mom = {
        1103: 2329, // l click
        3101: 1371, // r click
        3110: [1061, 2636], // 3 (fire breath)
        4110: 3095, // 4 (laser)
        4170: 2102, // 1 (dash)
        4180: [772, 460, 700], // 2 (jump forward)
    };

    const accept_dest_on_skills = [
        1103,
        4150,
        4160,
        4170,
        4180,
    ];

    function printer(...args) {
        if(!enabled() || !is_debug_mode) return;
        console.log(`[${Date.now() % 10000}]`, ...args);
    } 

    function enabled() {
        return mod.game.me.zone == 118 && is_enabled;
    }

    function get_skill_info(skill) {
        printer("is_mom:", is_mom);
        if(is_mom) return skill_lengths_mom[skill];
        return skill_lengths_kid[skill];
    }

    function send_animation(e, stage, end) {
        let event = Object.assign({}, e, {
            gameId: gameId,
            templateId: (is_mom ? 5000 : 6000),
            stage: stage,
            speed: 1,
            projectileSpeed: 1,
            id: current_skill_id,
            effectScale: 1,
            type: 0,
            target: 0,
            moving: false
        });

        if((stage || end) && force_position) {
            event.loc.x = force_position.x || event.loc.x;
            event.loc.y = force_position.y || event.loc.y;
            event.loc.z = force_position.z || event.loc.z;
            force_position = null;
        }

        if(end) {
            mod.send("S_ACTION_END", 5, event);
        } else {
            mod.send("S_ACTION_STAGE", 9, event);
        }
    }

    function emulate_skill(skill, stage, event) {
        const info = get_skill_info(skill);
        printer("info:", info);
        const action_end_next = !(Array.isArray(info) && info.length - 1 != stage);
        printer("action_end_next:", action_end_next);
        const delay = (Array.isArray(info) && info[stage]) || info;
        printer("delay:", delay);

        send_animation(event, stage, false);
        setTimeout(()=> {
            if(!action_end_next) emulate_skill(skill, stage + 1, event);
            else send_animation(event, stage, true);
        }, delay);
    }

    mod.hook("C_START_SKILL", 7, {order: -20}, e=> {
        e.skill.huntingZoneId = 118;
        e.skill.npc = true;
        printer("C_START_SKILL", e);
        if(is_mom === null || !enabled()) return; // we don't have a state yet
        current_skill_id++;
        emulate_skill(e.skill.id, 0, e);
    });
    
    mod.hook("S_ACTION_STAGE", 9, {order: -50, filter:{fake: null}}, (e, fake)=> {
        if(gameId == e.gameId && enabled()) {
            printer("S_ACTION_STAGE", fake, e);
            if(!fake && e.dest.length() && accept_dest_on_skills.includes(e.skill.id)) force_position = e.dest.clone();
            if(is_mom !== null && !fake) return false;
            is_mom = e.templateId == 5000;
            accept_action_end = true;
        }
    });

    mod.hook("S_ACTION_END", 5, {order: -50, filter:{fake: null}}, (e, fake)=> {
        if(gameId == e.gameId && enabled()) {
            printer("S_ACTION_END", fake, e);
            if(is_mom !== null && !fake && !accept_action_end) return false;
            accept_action_end = false;
        }
    });

    mod.hook("S_MOUNT_VEHICLE_EX", 1, e=> {
        if(mod.game.me.is(e.target) && enabled()) {
            gameId = e.vehicle;
            is_mom = null;
        }
    });

    mod.command.add("kuma", ()=> {
        is_enabled = !is_enabled;
        mod.command.message(`Kuma prediction has been ${is_enabled ? "enabled" : "disabled"}.`);
    });
}

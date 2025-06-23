/**
 * Utility class for handling dice rolls in Mousquetaire de Sang.
 */
export class DiceRoller {
  /**
   * Show a dialog for configuring a profile roll
   * @param {string} profileLabel - The label of the profile
   * @param {number} profileValue - The value of the profile
   * @param {object} actor - The actor performing the roll
   * @param {Function} callback - Callback function to execute after the roll
   */
  static async showRollDialog(profileLabel: string, profileValue: number, actor: any, callback?: Function) {
    // Get Aels information
    const aelsItem = actor.items.find(i => i.type === "aels");
    const hasAels = !!aelsItem;
    const aelsValue = hasAels ? aelsItem.system.value : 0;

    // Load the dialog template
    const dialogContent = await renderTemplate("systems/fvtt-mds/templates/dice/dice-roll-dialog.hbs", {
      hasAels,
      aelsValue,
      profileValue,
      combatValue: profileValue + 1
    });

    // Show dialog
    new Dialog({
      title: `Jet de ${profileLabel} (${profileValue})`,
      content: dialogContent,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice"></i>',
          label: "Lancer les dés",
          callback: async (html) => {
            const form = html.find('form')[0];
            const activeTab = html.find('.tab.active').data('tab');

            if (activeTab === 'standard') {
              // Standard mode
              const bonusDice = parseInt(form.bonusDice.value) || 0;
              const staticBonus = parseInt(form.staticBonus.value) || 0;
              const selectedAelsValue = hasAels ? parseInt(form.useAelsValue.value) || 0 : 0;

              await this.performDiceRoll(profileLabel, profileValue, bonusDice, staticBonus, selectedAelsValue > 0, selectedAelsValue, actor);
            } else if (activeTab === 'passe-arme') {
              // Passe d'arme mode
              const bonusDice = parseInt(form.pasBonusDice.value) || 0;
              const attackDice = parseInt(form.pasAttackDice.value) || 0;
              const defenseDice = parseInt(form.pasDefenseDice.value) || 0;
              const attackBonus = parseInt(form.pasAttackBonus.value) || 0;
              const defenseBonus = parseInt(form.pasDefenseBonus.value) || 0;
              const attackAelsValue = hasAels ? parseInt(form.pasAttackAelsValue.value) || 0 : 0;
              const defenseAelsValue = hasAels ? parseInt(form.pasDefenseAelsValue.value) || 0 : 0;

              await this.performPasseArmeDiceRoll(
                profileLabel, 
                attackDice, 
                defenseDice, 
                attackBonus, 
                defenseBonus, 
                attackAelsValue > 0,
                attackAelsValue,
                defenseAelsValue > 0,
                defenseAelsValue,
                actor
              );
            }

            if (callback) callback();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Annuler"
        }
      },
      default: "roll",
      render: (html) => {
        // Initialize tabs
        const tabs = new Tabs({
          navSelector: ".tabs",
          contentSelector: ".tab-content",
          initial: "standard",
          callback: (tab) => {}
        });
        tabs.bind(html[0]);
      }
    }, {
      width: 800,
      height: 600,
      classes: ["fvtt-mds", "dialog"]
    }).render(true);
  }

  /**
   * Perform the dice roll with the specified parameters
   * @param {string} profileLabel - The label of the profile
   * @param {number} profileValue - The value of the profile
   * @param {number} bonusDice - Number of bonus dice
   * @param {number} staticBonus - Static bonus to add to the result
   * @param {boolean} useAels - Whether to use Aels
   * @param {number} aelsValue - The value of the Aels
   * @param {object} actor - The actor performing the roll
   */
  static async performDiceRoll(
    profileLabel: string, 
    profileValue: number, 
    bonusDice: number, 
    staticBonus: number, 
    useAels: boolean, 
    aelsValue: number,
    actor: any
  ) {
    // Calculate total dice to roll
    const totalDice = profileValue + bonusDice;

    // Roll the dice
    const roll = await new Roll(`${totalDice}d10`).evaluate({async: true});

    // Get individual dice results
    const diceResults = roll.dice[0].results.map(d => d.result);

    // Find the highest die value
    const highestDieValue = Math.max(...diceResults);

    // Calculate total using only the highest die
    let total = highestDieValue + staticBonus;

    // Check for Aels bonus
    let aelsBonus = 0;
    let aelsFatigue = 0;
    let aelsFormattedResults = [];
    if (useAels && aelsValue > 0) {
      const aelRols = await new Roll(`${aelsValue}d6`).evaluate({async: true});
      const aelDiceResults = aelRols.dice[0].results.map(d => d.result);
      aelsBonus = aelDiceResults.filter(r => r >= 4).length * 2;
      aelsFatigue = aelDiceResults.filter(r => r === 1).length;
      total += aelsBonus;

      aelsFormattedResults = aelDiceResults.map(r => ({
        value: r,
        isComplication: r === 1,
        isHighest: r >= 4
      }));
    }

    // Check for complications (half or more dice showing "1")
    const hasComplication = diceResults.every(r => r === 1);

    // Check for advantages (multiple dice showing the highest value)
    const hasAdvantage = diceResults.filter(r => r === highestDieValue).length > 1;

    // Prepare the dice results for the template
    const formattedDiceResults = diceResults.map(r => ({
      value: r,
      isComplication: r === 1,
      isHighest: r === highestDieValue
    }));

    // Render the template
    const messageContent = await renderTemplate("systems/fvtt-mds/templates/dice/dice-roll-result.hbs", {
      profileLabel,
      profileValue,
      totalDice,
      staticBonus,
      diceResults: formattedDiceResults,
      aelsDiceResults: aelsFormattedResults,
      total,
      aelsBonus: aelsBonus > 0 ? aelsBonus : null,
      aelsFatigue: aelsFatigue > 0 ? aelsFatigue : null,
      hasComplication,
      hasAdvantage,
      actorName: actor.name,
      actorImg: actor.img
    });

    // Create the chat message
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: messageContent,
      sound: CONFIG.sounds.dice,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: roll
    });
  }
  /**
   * Perform the Passe d'Arme dice roll with the specified parameters
   * @param {string} profileLabel - The label of the profile
   * @param {number} attackDice - Number of attack dice
   * @param {number} defenseDice - Number of defense dice
   * @param {number} attackBonus - Static bonus to add to the attack result
   * @param {number} defenseBonus - Static bonus to add to the defense result
   * @param {boolean} useAttackAels - Whether to use Aels for attack
   * @param {number} attackAelsValue - The value of the Aels for attack
   * @param {boolean} useDefenseAels - Whether to use Aels for defense
   * @param {number} defenseAelsValue - The value of the Aels for defense
   * @param {object} actor - The actor performing the roll
   */
  static async performPasseArmeDiceRoll(
    profileLabel: string,
    attackDice: number,
    defenseDice: number,
    attackBonus: number,
    defenseBonus: number,
    useAttackAels: boolean,
    attackAelsValue: number,
    useDefenseAels: boolean,
    defenseAelsValue: number,
    actor: any
  ) {
    // First perform attack roll
    await this.performDiceRoll(
      `${profileLabel} (Attaque)`,
      attackDice,
        0,
      attackBonus,
      useAttackAels,
      attackAelsValue,
      actor
    );

    // Then perform defense roll
    await this.performDiceRoll(
      `${profileLabel} (Défense)`,
      defenseDice,
        0,
      defenseBonus,
      useDefenseAels,
      defenseAelsValue,
      actor
    );
  }

}

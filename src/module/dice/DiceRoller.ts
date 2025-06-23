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
      aelsValue
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
            const bonusDice = parseInt(form.bonusDice.value) || 0;
            const staticBonus = parseInt(form.staticBonus.value) || 0;
            const useAels = hasAels && form.useAels?.checked;

            await this.performDiceRoll(profileLabel, profileValue, bonusDice, staticBonus, useAels, aelsValue, actor);

            if (callback) callback();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Annuler"
        }
      },
      default: "roll"
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
    if (useAels && aelsValue > 1) {
      diceResults.forEach(result => {
        if (result === aelsValue) {
          aelsBonus += 2;
        }
      });
      total += aelsBonus;
    }

    // Check for complications (half or more dice showing "1")
    const onesCount = diceResults.filter(r => r === 1).length;
    const hasComplication = onesCount >= Math.ceil(totalDice / 2);

    // Check for advantages (multiple dice showing the same value, except 1)
    const valueCounts = {};
    diceResults.forEach(result => {
      if (result !== 1) {
        valueCounts[result] = (valueCounts[result] || 0) + 1;
      }
    });

    // Find values that appear multiple times (for advantage highlighting)
    const advantageValues = Object.entries(valueCounts)
      .filter(([_, count]) => (count as number) > 1)
      .map(([value, _]) => parseInt(value));

    const hasAdvantage = advantageValues.length > 0;

    // Prepare the dice results for the template
    const formattedDiceResults = diceResults.map(r => ({
      value: r,
      isComplication: r === 1,
      isAels: useAels && r === aelsValue,
      isAdvantage: advantageValues.includes(r),
      isHighest: r === highestDieValue
    }));

    // Render the template
    const messageContent = await renderTemplate("systems/fvtt-mds/templates/dice/dice-roll-result.hbs", {
      profileLabel,
      profileValue,
      totalDice,
      staticBonus,
      diceResults: formattedDiceResults,
      total,
      aelsBonus: aelsBonus > 0 ? aelsBonus : null,
      hasComplication,
      hasAdvantage
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
}

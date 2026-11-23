const ticket = {
  title: 'Company app access denied',
  report: 'Several people can sign in to their managed Chromebooks, but the company app rejects their devices. The service desk has not identified the scope yet.',
  steps: [
    {
      title: 'Scope the incident',
      prompt: 'What would you check first?',
      choices: [
        {
          title: 'Compare affected and working users and devices',
          recommended: true,
          explanation: 'A small comparison can show whether the failure follows a user, a device group, or the app itself.'
        },
        {
          title: 'Check the office network for an outage',
          explanation: 'A network check is reasonable if reachability fails. Here the app responds with a device-specific error, so compare affected and working requests first.'
        },
        {
          title: 'Ask everyone affected to reset their password',
          explanation: 'The users can already sign in. A reset adds work before you know whether the issue follows the account.'
        }
      ],
      finding: 'The same account succeeds on a known-good Chromebook. Every failing device is in the newly enrolled group.'
    },
    {
      title: 'Find the difference',
      prompt: 'Where would you look for evidence now?',
      choices: [
        {
          title: 'Clear the browser cache on one failing device',
          explanation: 'That can help with a stale session, but the shared enrollment group gives you a stronger lead to check first.'
        },
        {
          title: 'Compare applied device policies and recent changes',
          recommended: true,
          explanation: 'A side-by-side policy check narrows the search to changes that could explain the affected group.'
        },
        {
          title: 'Review the app provider’s status page',
          explanation: 'A status page can flag a broader incident. Access from known-good devices makes the local policy difference more useful here.'
        }
      ],
      finding: 'The new group is missing a device policy that supplies the trust signal required by the app. The change record shows that the group was moved during enrollment.'
    },
    {
      title: 'Verify recovery',
      prompt: 'The approved policy was restored. How would you confirm the fix?',
      choices: [
        {
          title: 'Close the ticket when policy sync completes',
          explanation: 'A sync confirms that the device received the policy. The original app workflow still needs to succeed.'
        },
        {
          title: 'Roll the policy out to every device group immediately',
          explanation: 'The evidence points to a specific group. Expanding the change would introduce risk for devices that already work.'
        },
        {
          title: 'Confirm the policy and retest access with affected users',
          recommended: true,
          explanation: 'Confirm what the device received, then verify the original symptom with a representative set of affected users.'
        }
      ],
      finding: 'A pilot device receives the policy and opens the app. A second affected user confirms recovery, and a known-good device still works.'
    }
  ]
};

export function initFixit(root) {
  const document = root.ownerDocument;
  let stepIndex = 0;
  let recommendedCount = 0;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function button(label, className, action) {
    const node = element('button', className, label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }

  const summary = element('div', 'fixit-ticket');
  summary.append(
    element('p', 'fixit-progress', 'Fictional support ticket'),
    element('h2', '', ticket.title),
    element('p', '', ticket.report)
  );

  const stage = element('div', 'fixit-stage');
  root.replaceChildren(summary, stage);

  function stageHeading(label, focus) {
    const heading = element('h3', '', label);
    heading.tabIndex = -1;
    stage.append(heading);
    if (focus) heading.focus();
  }

  function renderStep(focus = false) {
    const step = ticket.steps[stepIndex];
    const options = element('div', 'fixit-options');
    for (const choice of step.choices) {
      options.append(button(choice.title, 'btn fixit-choice', () => renderFinding(choice)));
    }

    stage.replaceChildren(element('p', 'fixit-progress', `Step ${stepIndex + 1} of ${ticket.steps.length}`));
    stageHeading(step.title, focus);
    stage.append(element('p', '', step.prompt), options);
  }

  function renderFinding(choice) {
    if (choice.recommended) recommendedCount += 1;
    const step = ticket.steps[stepIndex];
    const lastStep = stepIndex === ticket.steps.length - 1;
    const feedback = element('div', 'fixit-feedback');
    if (choice.recommended) feedback.classList.add('fixit-feedback--recommended');
    feedback.append(
      element('p', '', choice.explanation),
      element('p', 'fixit-finding', step.finding)
    );

    const actions = element('div', 'fixit-actions');
    actions.append(button(lastStep ? 'Review resolution' : 'Next step', 'btn def', () => {
      if (lastStep) {
        renderResolution();
      } else {
        stepIndex += 1;
        renderStep(true);
      }
    }));

    stage.replaceChildren(element('p', 'fixit-progress', `Step ${stepIndex + 1} of ${ticket.steps.length}`));
    stageHeading(choice.recommended ? 'Recommended check' : 'Another way to narrow this down', true);
    stage.append(feedback, actions);
  }

  function renderResolution() {
    const resolutionTitle = 'Device trust policy restored';
    const resolution = element('div', 'fixit-resolution');
    resolution.append(
      element('p', '', 'The enrollment move left the new device group without the policy the app needed to recognize trusted devices.'),
      element('p', '', 'Recovery was confirmed on affected devices while a known-good device continued to work.'),
      element('p', 'fixit-progress', `${recommendedCount} of ${ticket.steps.length} recommended checks selected`)
    );

    const actions = element('div', 'fixit-actions');
    const printTicket = element('button', 'btn', 'Print ticket');
    printTicket.type = 'button';
    printTicket.dataset.open = 'printer';
    printTicket.dataset.receipt = 'fixit';
    printTicket.dataset.ticket = ticket.title;
    printTicket.dataset.resolution = resolutionTitle;
    printTicket.dataset.summary = `${recommendedCount} of ${ticket.steps.length} recommended checks selected`;
    actions.append(button('Replay ticket', 'btn def', () => {
      stepIndex = 0;
      recommendedCount = 0;
      renderStep(true);
    }), printTicket);

    stage.replaceChildren(element('p', 'fixit-progress', 'Ticket resolved'));
    stageHeading(resolutionTitle, true);
    stage.append(resolution, actions);
  }

  renderStep();
}

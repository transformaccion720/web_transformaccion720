// Lógica pura propia de TA720: calculadoras del diagnóstico y botones con acción.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costSavings, fmtMoney, fmtNumber, hoursLost } from '../src/lib/diagnostic.ts';
import { actionAttrs, contactHref } from '../src/lib/actions.ts';

test('horas perdidas: mismos resultados que el mockup (15 personas, 6 h, $18)', () => {
  const r = hoursLost({ team: 15, hours: 6, rate: 18 });
  assert.equal(r.annualHours, 4320);
  assert.equal(r.annualCost, 77760);
  assert.equal(`${fmtNumber(r.annualHours)} h`, '4,320 h');
  assert.equal(fmtMoney(r.annualCost), '$77,760');
});

test('horas perdidas: valores vacíos o negativos cuentan como 1', () => {
  assert.deepEqual(hoursLost({ team: 0, hours: -3, rate: NaN }), { annualHours: 48, annualCost: 48 });
});

test('ahorro en costos: mismos resultados que el mockup ($350K–$1M, alto)', () => {
  assert.deepEqual(costSavings(750000, 0.11), { savings: 82500, monthlyHours: 286 });
});

test('botones con acción', () => {
  assert.equal(
    contactHref('Web Corporativa Premium'),
    '/conversemos?servicio=Web%20Corporativa%20Premium#formulario'
  );
  assert.deepEqual(actionAttrs({ action: 'diagnosticCosts', value: '' }).attrs, {
    type: 'button',
    'data-open-diagnostic': 'costos',
  });
  assert.equal(actionAttrs({ action: 'link', value: 'https://skool.com' }).attrs.target, '_blank');
  assert.equal(actionAttrs({ action: 'link', value: '#portafolio' }).attrs.href, '#portafolio');
  assert.equal(
    actionAttrs({ action: 'video', value: 'https://youtu.be/x' }).attrs['data-video'],
    'https://youtu.be/x'
  );
});

test('seguridad: un botón del CMS nunca puede ejecutar código', () => {
  assert.equal(actionAttrs({ action: 'link', value: 'javascript:alert(1)' }).attrs.href, '#');
  assert.equal(actionAttrs({ action: 'link', value: ' JavaScript:alert(1)' }).attrs.href, '#');
  assert.equal(actionAttrs({ action: 'link', value: 'data:text/html,hola' }).attrs.href, '#');
});

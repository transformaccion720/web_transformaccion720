// Pruebas de la lógica pura (Node ejecuta TypeScript directamente).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailList, fill, highlight, initials, plain, price, safeJson, sender, waLink } from '../src/lib/format.ts';

test('precio siempre con dos decimales', () => {
  assert.equal(price(349), '349.00');
  assert.equal(price(0.1 + 0.2), '0.30');
  assert.equal(price(83), '83.00');
});

test('las variables del CMS se reemplazan y las desconocidas se mantienen', () => {
  assert.equal(fill('Hola {nombre}, total S/ {total}', { nombre: 'Ana', total: '10.00' }), 'Hola Ana, total S/ 10.00');
  assert.equal(fill('Hola {otro}', { nombre: 'Ana' }), 'Hola {otro}');
});

test('enlace de WhatsApp: solo dígitos y mensaje codificado', () => {
  assert.equal(waLink('+51 999 999 999'), 'https://wa.me/51999999999');
  assert.equal(waLink('51999999999', 'Hola & *pack*'), 'https://wa.me/51999999999?text=Hola%20%26%20*pack*');
  assert.equal(waLink('', 'x'), '');
});

test('iniciales y resaltado de títulos', () => {
  assert.equal(initials('Valeria Mendoza'), 'VM');
  assert.deepEqual(highlight('Elegir *Marca* hoy'), [
    { text: 'Elegir ', mark: false },
    { text: 'Marca', mark: true },
    { text: ' hoy', mark: false },
  ]);
  assert.equal(plain('Elegir *Marca*'), 'Elegir Marca');
});

test('el JSON incrustado no puede cerrar la etiqueta <script>', () => {
  assert.ok(!safeJson({ a: '</script><script>alert(1)</script>' }).includes('</script>'));
});

test('correos del CMS: lista y remitente completos', () => {
  assert.deepEqual(emailList('contacto@tuempresa.com, ventas@tuempresa.com;x'), ['contacto@tuempresa.com', 'ventas@tuempresa.com']);
  assert.equal(sender('Marca', 'web@tuempresa.com', 'x'), 'Marca <web@tuempresa.com>');
  assert.equal(sender('', 'web@tuempresa.com', 'x'), 'web@tuempresa.com');
  assert.equal(sender('Marca', '', 'respaldo'), 'respaldo');
});

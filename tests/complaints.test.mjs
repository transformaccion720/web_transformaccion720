// Libro de Reclamaciones: validación legal de la hoja, numeración y correo (lógica pura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GOOD_TYPES,
  complaintEmail,
  complaintSchema,
  fallbackNumber,
  formatNumber,
} from '../src/lib/complaints.ts';

const valid = {
  fullName: 'Ana Pérez',
  docType: 'DNI',
  docNumber: '12345678',
  address: 'Av. Siempre Viva 123, Lima',
  phone: '987654321',
  email: 'ana@correo.pe',
  isMinor: false,
  goodType: GOOD_TYPES[0],
  amount: '150.50',
  goodDescription: 'Consultoría',
  claimType: 'Reclamo',
  detail: 'El servicio no se entregó en la fecha acordada.',
  request: 'Reprogramar la entrega',
  acceptPrivacy: true,
};

test('hoja válida pasa la validación', () => {
  assert.equal(complaintSchema.safeParse(valid).success, true);
});

test('campos obligatorios y formatos inválidos se rechazan con el campo indicado', () => {
  const field = (data) => complaintSchema.safeParse(data).error?.issues[0]?.path.join('.');
  assert.equal(field({ ...valid, email: 'no-es-correo' }), 'email');
  assert.equal(field({ ...valid, docNumber: '12<3>' }), 'docNumber');
  assert.equal(field({ ...valid, amount: '12,345.678' }), 'amount');
  assert.equal(field({ ...valid, goodType: 'Otro' }), 'goodType');
  assert.equal(complaintSchema.safeParse({ ...valid, acceptPrivacy: false }).success, false);
});

test('menor de edad exige nombre del apoderado', () => {
  const r = complaintSchema.safeParse({ ...valid, isMinor: true, guardianName: '' });
  assert.equal(r.success, false);
  assert.equal(r.error.issues[0].path.join('.'), 'guardianName');
  assert.equal(
    complaintSchema.safeParse({ ...valid, isMinor: true, guardianName: 'Luis Pérez' }).success,
    true
  );
});

test('número correlativo y número de respaldo', () => {
  assert.equal(formatNumber(7, 2026), '000007-2026');
  assert.match(fallbackNumber(new Date('2026-01-02T03:04:05Z')), /^W20260102030405\d{2}$/);
});

test('el correo de la hoja escapa lo que escribe el consumidor', () => {
  const c = complaintSchema.parse({ ...valid, detail: '<script>alert(1)</script> no llegó' });
  const html = complaintEmail(
    c,
    '000001-2026',
    new Date(),
    { businessName: 'TA', tradeName: 'TA', ruc: '1', address: 'Lima' },
    ''
  );
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('000001-2026'));
});

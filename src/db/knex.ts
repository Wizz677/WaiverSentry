import Knex from 'knex';
import path from 'path';

const dbUrl = process.env.DATABASE_URL;

export const knex = dbUrl
  ? Knex({
      client: 'pg',
      connection: dbUrl,
    })
  : Knex({
      client: 'better-sqlite3',
      connection: {
        filename: path.join(process.cwd(), 'waivers.sqlite'),
      },
      useNullAsDefault: true,
    });

export async function initDb() {
  const hasTable = await knex.schema.hasTable('waivers');
  if (!hasTable) {
    await knex.schema.createTable('waivers', (table) => {
      table.string('exception_id').primary();
      table.string('type').notNullable();
      table.string('requester').notNullable();
      table.string('approver').notNullable();
      table.string('justification').notNullable();
      table.string('start_date').notNullable();
      table.string('end_date').notNullable();
      table.string('status').notNullable();
      table.string('risk_level').notNullable();
      table.integer('renewal_count').notNullable().defaultTo(0);
    });
  }

  const hasLogsTable = await knex.schema.hasTable('activity_logs');
  if (!hasLogsTable) {
    await knex.schema.createTable('activity_logs', (table) => {
      table.increments('id').primary();
      table.string('exception_id').notNullable();
      table.string('timestamp').notNullable();
      table.string('action').notNullable();
      table.string('user').notNullable();
      table.text('notes');
    });
  }
}

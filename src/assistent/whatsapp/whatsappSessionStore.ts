// src/whatsapp/whatsappSession/whatsappSessionStore.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Store } from 'whatsapp-web.js';
import * as fs from 'fs';
import { GridFSBucket } from 'mongodb';

@Injectable()
export class WhatsappSessionStoreService implements Store {
  private readonly logger = new Logger(WhatsappSessionStoreService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  private getBucket(session: string) {
    return new GridFSBucket(this.connection.db!, {
      bucketName: `whatsapp-${session}`,
    });
  }

  async sessionExists(options: { session: string }): Promise<boolean> {
    const bucket = this.getBucket(options.session);
    const files = await bucket
      .find({ filename: `${options.session}.zip` })
      .toArray();
    const exists = files.length > 0;
    this.logger.debug(`Sessão ${options.session} existe? ${exists}`);
    return exists;
  }

  async save(options: { session: string }): Promise<void> {
    const session = options.session;
    const zipPath = `${session}.zip`;
    this.logger.debug(`Salvando sessão ${session} a partir de ${zipPath}`);

    if (!fs.existsSync(zipPath)) {
      this.logger.warn(`Arquivo de sessão não encontrado em disco: ${zipPath}`);
      return;
    }

    const bucket = this.getBucket(session);
    const upload = bucket.openUploadStream(`${session}.zip`);
    const stream = fs.createReadStream(zipPath);

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(upload)
        .on('error', (err) => {
          this.logger.error(`Erro no upload da sessão: ${err.message}`);
          reject(err);
        })
        .on('finish', () => {
          this.logger.debug(`Sessão ${session} salva no MongoDB`);
          resolve();
        });
    });
  }

  async extract(options: { session: string; path: string }): Promise<void> {
    const session = options.session;
    const bucket = this.getBucket(session);
    this.logger.debug(`Extraindo sessão ${session} para ${options.path}`);

    await new Promise<void>((resolve, reject) => {
      bucket
        .openDownloadStreamByName(`${session}.zip`)
        .pipe(fs.createWriteStream(options.path))
        .on('error', (err) => {
          this.logger.error(`Erro no download da sessão: ${err.message}`);
          reject(err);
        })
        .on('finish', () => {
          this.logger.debug(`Sessão ${session} extraída com sucesso`);
          resolve();
        });
    });
  }

  async delete(options: { session: string }): Promise<void> {
    const session = options.session;
    const bucket = this.getBucket(session);
    this.logger.debug(`Deletando sessão ${session} no MongoDB`);

    const docs = await bucket.find({ filename: `${session}.zip` }).toArray();
    await Promise.all(docs.map((doc) => bucket.delete(doc._id)));
    this.logger.debug(`Sessão ${session} removida do MongoDB`);
  }
}

import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type {
    TCreateProject,
    TProject,
} from '../domain/configuration.entities';
import { ConfigurationGateway } from '../domain/configuration.gateway';

@Injectable()
export class CreateProjectUseCase {
    constructor(private readonly configurationGateway: ConfigurationGateway) {}

    async execute(projectInput: TCreateProject): Promise<TProject> {
        const projectName = projectInput?.name?.trim();
        const projectIri = projectInput?.iri?.trim();
        const applicationId = projectInput?.applicationId;

        if (!projectName || !projectIri || !applicationId) {
            throw new BadRequestException('Informe os dados do projeto.');
        }

        const associatedApplication =
            await this.configurationGateway.findApplicationById(applicationId);

        if (!associatedApplication?.active) {
            throw new NotFoundException('Aplicação não encontrada ou inativa.');
        }

        const registeredProject =
            await this.configurationGateway.findProjectByIri(projectIri);

        if (registeredProject) {
            throw new ConflictException('Projeto já cadastrado.');
        }

        return this.configurationGateway.createProject({
            name: projectName,
            iri: projectIri,
            applicationId,
        });
    }
}

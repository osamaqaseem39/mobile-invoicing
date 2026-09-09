import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RmaService } from "./rma.service";
import { ApplyRmaCreditDto, CreateRmaDto, ProcessRmaDto } from "./dto/rma.dto";

@Controller("rma")
@UseGuards(JwtAuthGuard)
export class RmaController {
  constructor(private rma: RmaService) {}

  @Get()
  findAll(@Query("customerId") customerId?: string) {
    return this.rma.listRmas(customerId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.rma.getRma(id);
  }

  @Post()
  create(@Body() dto: CreateRmaDto) {
    return this.rma.createRma(dto);
  }

  @Patch(":id")
  process(@Param("id") id: string, @Body() dto: ProcessRmaDto) {
    return this.rma.processRma(id, dto.status);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.rma.deleteRma(id);
  }

  @Post(":id/credit")
  @HttpCode(HttpStatus.OK)
  applyCredit(@Param("id") id: string, @Body() dto: ApplyRmaCreditDto) {
    return this.rma.applyRmaCredit(id, dto);
  }
}

import { ROUTE_ARGS_METADATA } from "@packages/common/constants";
import { RouteParamtypes } from "@packages/common/enums";

export type ParamData = string;

export interface RouteParamMetadata {
  index: number;
  data?: ParamData;
}
function assignMetadata<TParamtype = any, TArgs = any>(
  args: TArgs,
  paramtype: TParamtype,
  index: number,
  data?: ParamData
) {
  return {
    ...args,
    [`${paramtype as string}:${index}`]: {
      index,
      data,
    },
  };
}
function createRouteParamDecorator(paramtype: RouteParamtypes) {
  return (data?: ParamData): ParameterDecorator =>
    (target, key, index) => {
      const args =
        Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key!) ||
        {};
      Reflect.defineMetadata(
        ROUTE_ARGS_METADATA,
        assignMetadata<RouteParamtypes, Record<number, RouteParamMetadata>>(
          args,
          paramtype,
          index,
          data
        ),
        target.constructor,
        key!
      );
    };
}
export const Param = createRouteParamDecorator(RouteParamtypes.PARAM);
export const Query = createRouteParamDecorator(RouteParamtypes.QUERY);
export const Body = createRouteParamDecorator(RouteParamtypes.BODY);
export const Response = createRouteParamDecorator(RouteParamtypes.RESPONSE);
export const Request = createRouteParamDecorator(RouteParamtypes.REQUEST);
export const Res = Response;
export const Req = Request;
